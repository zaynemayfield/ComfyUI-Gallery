# folder_scanner.py
import hashlib
import json
import os
import subprocess
from datetime import datetime
from .metadata_extractor import buildMetadata, get_size  # Import metadata extractor

# Default extensions include images, media, audio, and 3D
DEFAULT_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.webp', '.gif',  # Images
    '.mp4', '.webm', '.mov',   # Media
    '.wav', '.mp3', '.m4a', '.flac',   # Audio
    '.obj', '.glb', '.gltf', '.fbx', '.stl', '.usd', '.usdz' # 3D
]

GALLERY_INDEX_VERSION = 1
INDEX_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".gallery_index_cache")


def get_video_duration(path):
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        duration = float(result.stdout.strip())
        if duration > 0:
            minutes = int(duration // 60)
            seconds = int(duration % 60)
            return f"{minutes}:{seconds:02d}"
    except Exception:
        return ""
    return ""


def _normalize_extensions(allowed_extensions=None):
    if allowed_extensions is None:
        allowed_extensions = DEFAULT_EXTENSIONS

    return tuple(
        sorted(
            {
                ext.lower() if str(ext).startswith(".") else f".{str(ext).lower()}"
                for ext in allowed_extensions
            }
        )
    )


def _index_cache_path(full_base_path, base_path, include_subfolders, allowed_extensions_tuple):
    cache_key = json.dumps(
        {
            "root": os.path.normcase(os.path.realpath(full_base_path)),
            "base": base_path,
            "recursive": bool(include_subfolders),
            "extensions": list(allowed_extensions_tuple),
        },
        sort_keys=True,
    )
    digest = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
    return os.path.join(INDEX_CACHE_DIR, f"{digest}.json")


def _load_gallery_index(index_path):
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if data.get("version") != GALLERY_INDEX_VERSION:
            return {"entries": {}}
        entries = data.get("entries")
        if not isinstance(entries, dict):
            return {"entries": {}}
        return data
    except FileNotFoundError:
        return {"entries": {}}
    except Exception as e:
        print(f"Gallery Node: Error loading gallery index {index_path}: {e}")
        return {"entries": {}}


def _save_gallery_index(index_path, index_data):
    try:
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        temp_path = f"{index_path}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(index_data, f, separators=(",", ":"))
        os.replace(temp_path, index_path)
    except Exception as e:
        print(f"Gallery Node: Error saving gallery index {index_path}: {e}")


def _file_signature(stat):
    return {
        "mtime_ns": getattr(stat, "st_mtime_ns", int(stat.st_mtime * 1_000_000_000)),
        "size": stat.st_size,
    }


def _build_file_data(full_path, dir_path, full_base_path, entry, stat):
    timestamp = stat.st_mtime
    date_str = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")
    rel_path = os.path.relpath(dir_path, full_base_path)
    filename = entry
    subfolder = rel_path if rel_path != "." else ""
    if len(subfolder) > 0:
        url_path = f"/static_gallery/{subfolder}/{filename}"
    else:
        url_path = f"/static_gallery/{filename}"
    url_path = url_path.replace("\\", "/")

    metadata = {
        "fileinfo": {
            "filename": full_path,
            "resolution": "",
            "date": date_str,
            "size": str(get_size(full_path)),
        }
    }
    file_type = "unknown"
    ext = os.path.splitext(entry.lower())[1]

    if ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
        file_type = "image"
        try:
            _, _, metadata = buildMetadata(full_path)
        except Exception as e:
            print(f"Gallery Node: Error building metadata for {full_path}: {e}")
    elif ext in ['.mp4', '.webm', '.mov']:
        file_type = "media"
        metadata["fileinfo"]["duration"] = get_video_duration(full_path)
    elif ext in ['.wav', '.mp3', '.m4a', '.flac']:
        file_type = "audio"
    elif ext in ['.obj', '.glb', '.gltf', '.fbx', '.stl', '.usd', '.usdz']:
        file_type = "3d"

    return {
        "name": entry,
        "url": url_path,
        "timestamp": timestamp,
        "date": date_str,
        "metadata": metadata,
        "type": file_type
    }


def _scan_for_images(full_base_path, base_path, include_subfolders, allowed_extensions=None):
    """Scans directories for files matching allowed extensions.

    The scan keeps a server-side metadata index and only rebuilds expensive
    metadata for files whose path, size, or mtime changed since the last scan.
    """
    allowed_extensions_tuple = _normalize_extensions(allowed_extensions)
    index_path = _index_cache_path(full_base_path, base_path, include_subfolders, allowed_extensions_tuple)
    gallery_index = _load_gallery_index(index_path)
    indexed_entries = gallery_index.get("entries", {})
    next_entries = {}

    folders_data = {}
    current_files = set()
    changed = False

    def scan_directory(dir_path, relative_path=""):
        """Recursively scans a directory for files matching allowed extensions."""
        nonlocal changed
        folder_content = {}  # Dictionary to hold files for the current folder
        try:
            with os.scandir(dir_path) as it:
                file_entries = []
                for entry in it:
                    if entry.is_dir(follow_symlinks=False):
                        if include_subfolders and not entry.name.startswith("."):
                            next_relative_path = os.path.join(relative_path, entry.name)
                            scan_directory(entry.path, next_relative_path)
                    elif entry.is_file(follow_symlinks=False):
                        file_entries.append((entry.path, entry.name, entry.stat(follow_symlinks=False)))
                        current_files.add(entry.path)

            for full_path, entry, stat in file_entries:
                lower_entry = entry.lower()
                if lower_entry.endswith(allowed_extensions_tuple):
                    try:
                        rel_file = os.path.relpath(full_path, full_base_path).replace("\\", "/")
                        signature = _file_signature(stat)
                        indexed = indexed_entries.get(rel_file)

                        if indexed and indexed.get("signature") == signature and isinstance(indexed.get("data"), dict):
                            file_data = indexed["data"]
                        else:
                            file_data = _build_file_data(full_path, dir_path, full_base_path, entry, stat)
                            changed = True

                        next_entries[rel_file] = {
                            "signature": signature,
                            "data": file_data,
                        }
                        folder_content[entry] = file_data
                    except Exception as e:
                        print(f"Gallery Node: Error processing file {full_path}: {e}")

            folder_key = os.path.join(base_path, relative_path) if relative_path else base_path
            folder_key = folder_key.replace("\\", "/")
            folders_data[folder_key] = folder_content

        except Exception as e:
            print(f"Gallery Node: Error scanning directory {dir_path}: {e}")

    scan_directory(full_base_path, "")
    if set(indexed_entries.keys()) != set(next_entries.keys()):
        changed = True
    _save_gallery_index(
        index_path,
        {
            "version": GALLERY_INDEX_VERSION,
            "root": os.path.normcase(os.path.realpath(full_base_path)),
            "base": base_path,
            "recursive": bool(include_subfolders),
            "extensions": list(allowed_extensions_tuple),
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "entries": next_entries,
        },
    )
    return folders_data, changed
