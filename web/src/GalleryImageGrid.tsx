import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Descriptions, Empty, Image, Input, message, Modal, Slider, Spin, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import DeleteOutlined from '@ant-design/icons/lib/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/lib/icons/EditOutlined';
import InfoCircleOutlined from '@ant-design/icons/lib/icons/InfoCircleOutlined';
import FullscreenOutlined from '@ant-design/icons/lib/icons/FullscreenOutlined';
import FolderOpenOutlined from '@ant-design/icons/lib/icons/FolderOpenOutlined';
import MutedOutlined from '@ant-design/icons/lib/icons/MutedOutlined';
import PauseOutlined from '@ant-design/icons/lib/icons/PauseOutlined';
import PlayCircleOutlined from '@ant-design/icons/lib/icons/PlayCircleOutlined';
import RetweetOutlined from '@ant-design/icons/lib/icons/RetweetOutlined';
import SoundOutlined from '@ant-design/icons/lib/icons/SoundOutlined';
import { AutoSizer } from 'react-virtualized';
import { VariableSizeGrid } from 'react-window';
import ImageCard, { ImageCardHeight, ImageCardWidth } from './ImageCard';
import { useGalleryContext } from './GalleryContext';
import { ModelViewer } from './ModelViewer';
import type { FileDetails } from './types';
import { BASE_PATH, BASE_Z_INDEX, ComfyAppApi } from "./ComfyAppApi";
import { getFolderMediaList } from './galleryFolderUtils';
import type { GalleryPreviewSize } from './GalleryContext';
import { parseComfyMetadata } from './metadata-parser/metadataParser';
import ReactJsonView from '@microlink/react-json-view';

const GRID_GAP = 16;
const PREVIEW_SIZE_DIMENSIONS: Record<GalleryPreviewSize, { width: number; height: number }> = {
    small: { width: 220, height: 285 },
    medium: { width: ImageCardWidth, height: ImageCardHeight },
    large: { width: 460, height: 590 },
};

const getPreviewLayout = (containerWidth: number, previewSize: GalleryPreviewSize) => {
    const desired = PREVIEW_SIZE_DIMENSIONS[previewSize];
    const safeWidth = Math.max(1, containerWidth);
    const columnCount = Math.max(1, Math.floor(safeWidth / (desired.width + GRID_GAP)));
    const columnWidth = Math.floor(safeWidth / columnCount);
    const cardWidth = Math.max(140, Math.min(desired.width, columnWidth - GRID_GAP));
    const cardHeight = Math.round(desired.height * (cardWidth / desired.width));

    return {
        columnCount,
        columnWidth,
        rowHeight: cardHeight + GRID_GAP,
        cardWidth,
        cardHeight,
    };
};

const isMediaItem = (item: FileDetails) => (
    item.type === "image" || item.type === "media" || item.type === "audio" || item.type === "3d"
);

type CompactFileDetails = FileDetails & {
    compactCount?: number;
    compactItems?: FileDetails[];
};

type DateDividerRow = {
    date: string;
    rowIndex: number;
    mediaBefore: number;
};

const getCompactGroupKey = (item: FileDetails) => {
    if (!isMediaItem(item)) return item.name;
    const stem = item.name.replace(/\.[^/.]+$/, "");
    return stem.replace(/-audio$/i, "").toLowerCase();
};

const isAudioVariant = (item: FileDetails) => {
    const stem = item.name.replace(/\.[^/.]+$/, "");
    return /-audio$/i.test(stem);
};

const compactRelatedOutputs = (items: FileDetails[]): CompactFileDetails[] => {
    const groups = new Map<string, FileDetails[]>();
    const orderedKeys: string[] = [];

    items.forEach(item => {
        const key = getCompactGroupKey(item);
        if (!groups.has(key)) {
            groups.set(key, []);
            orderedKeys.push(key);
        }
        groups.get(key)!.push(item);
    });

    return orderedKeys.map(key => {
        const group = groups.get(key)!;
        if (group.length === 1) return group[0];

        const representative =
            group.find(isAudioVariant)
            ?? group.find(item => item.type === 'media')
            ?? group.find(item => item.type === 'image')
            ?? group[0];

        const orderedGroup = [
            representative,
            ...group.filter(item => item.url !== representative.url),
        ];

        return {
            ...representative,
            compactCount: group.length,
            compactItems: orderedGroup,
        };
    });
};

const getPreviewItems = (items: FileDetails[]) => {
    return items.flatMap(item => (item as CompactFileDetails).compactItems ?? [item]);
};

const getFileStemAndExtension = (name: string) => {
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex <= 0) return { stem: name, extension: '' };
    return {
        stem: name.slice(0, dotIndex),
        extension: name.slice(dotIndex),
    };
};

const getFilePath = (image: FileDetails, fallbackFolder: string) => {
    const folder = image.sourceFolder || fallbackFolder;
    return folder ? `${folder}/${image.name}` : image.name;
};

const buildRenamedFileName = (image: FileDetails, newValue: string, isCompactGroup: boolean) => {
    const trimmed = newValue.trim();
    const { stem, extension } = getFileStemAndExtension(image.name);
    if (!isCompactGroup && trimmed.includes('.')) return trimmed;
    const suffix = isCompactGroup && stem.endsWith('-audio') ? '-audio' : '';
    return `${trimmed}${suffix}${extension}`;
};

const getDefaultRenameValue = (image: FileDetails, isCompactGroup: boolean) => {
    const { stem } = getFileStemAndExtension(image.name);
    return isCompactGroup && stem.endsWith('-audio') ? stem.slice(0, -6) : stem;
};

const buildFolderTreeData = (folderKeys: string[]): DataNode[] => {
    const roots: DataNode[] = [];
    const nodeMap = new Map<string, DataNode>();
    folderKeys
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .forEach(folderKey => {
            const parts = folderKey.split(/[\\/]+/).filter(Boolean);
            let currentPath = '';
            let siblings = roots;
            parts.forEach(part => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                let node = nodeMap.get(currentPath);
                if (!node) {
                    node = { key: currentPath, title: part, children: [] };
                    nodeMap.set(currentPath, node);
                    siblings.push(node);
                }
                siblings = (node.children ??= []);
            });
        });
    return roots;
};

const takeMediaBatch = (items: FileDetails[], limit: number) => {
    const result: FileDetails[] = [];
    let mediaCount = 0;

    for (const item of items) {
        if (mediaCount >= limit) break;
        result.push(item);
        if (isMediaItem(item)) mediaCount++;
    }

    return result;
};

const DATE_DIVIDER_ROW_HEIGHT = 26;
const PREVIEW_VOLUME_KEY = 'comfy-ui-gallery-preview-volume';
const PREVIEW_MUTED_KEY = 'comfy-ui-gallery-preview-muted';
const PREVIEW_LOOP_KEY = 'comfy-ui-gallery-preview-loop';

const getStoredPreviewVolume = () => {
    const raw = localStorage.getItem(PREVIEW_VOLUME_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.5;
};

const getStoredPreviewLoop = () => localStorage.getItem(PREVIEW_LOOP_KEY) === 'true';
const getStoredPreviewMuted = () => localStorage.getItem(PREVIEW_MUTED_KEY) === 'true';

const formatDuration = (duration?: number) => {
    if (!duration || Number.isNaN(duration)) return undefined;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PreviewVideo = ({ image }: { image: FileDetails }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [volume, setVolume] = useState(getStoredPreviewVolume);
    const [muted, setMuted] = useState(getStoredPreviewMuted);
    const [loop, setLoop] = useState(getStoredPreviewLoop);
    const [playing, setPlaying] = useState(true);
    const [duration, setDuration] = useState<number | undefined>(undefined);
    const videoDetails = [image.metadata?.fileinfo?.size, formatDuration(duration)].filter(Boolean).join(' - ');

    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.volume = volume;
        videoRef.current.muted = muted;
    }, [volume, muted, image.url]);

    useEffect(() => {
        localStorage.setItem(PREVIEW_LOOP_KEY, String(loop));
    }, [loop]);

    const togglePlayback = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().catch(() => undefined);
        } else {
            video.pause();
        }
    };

    const setMutedPreference = (nextMuted: boolean) => {
        setMuted(nextMuted);
        localStorage.setItem(PREVIEW_MUTED_KEY, String(nextMuted));
        if (videoRef.current) videoRef.current.muted = nextMuted;
    };

    const setVolumePreference = (nextVolume: number) => {
        const normalized = Math.max(0, Math.min(1, nextVolume));
        setVolume(normalized);
        localStorage.setItem(PREVIEW_VOLUME_KEY, String(normalized));
        if (videoRef.current) {
            videoRef.current.volume = normalized;
            if (normalized > 0 && videoRef.current.muted) {
                setMutedPreference(false);
            }
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                maxWidth: '92vw',
                maxHeight: '86vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
        >
            <video
                ref={videoRef}
                key={image.name}
                style={{ maxWidth: '92vw', maxHeight: 'calc(86vh - 44px)', width: 'auto', height: 'auto', cursor: 'pointer' }}
                src={`${BASE_PATH}${image.url}`}
                autoPlay
                controls={false}
                loop={loop}
                muted={muted}
                preload="metadata"
                onLoadedMetadata={(event) => {
                    event.currentTarget.volume = volume;
                    event.currentTarget.muted = muted;
                    setDuration(event.currentTarget.duration);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onVolumeChange={(event) => {
                    const nextVolume = event.currentTarget.volume;
                    const nextMuted = event.currentTarget.muted;
                    setVolume(nextVolume);
                    setMuted(nextMuted);
                    localStorage.setItem(PREVIEW_VOLUME_KEY, String(nextVolume));
                    localStorage.setItem(PREVIEW_MUTED_KEY, String(nextMuted));
                }}
                onClick={(event) => {
                    event.stopPropagation();
                    togglePlayback();
                }}
            />
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(0, 0, 0, 0.68)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#fff',
                }}
            >
                {videoDetails && (
                    <Typography.Text
                        style={{
                            color: 'rgba(255, 255, 255, 0.88)',
                            fontSize: 12,
                            lineHeight: '20px',
                            maxWidth: 180,
                        }}
                        ellipsis
                    >
                        {videoDetails}
                    </Typography.Text>
                )}
                <Button
                    size="small"
                    type="text"
                    icon={playing ? <PauseOutlined /> : <PlayCircleOutlined />}
                    onClick={togglePlayback}
                    style={{ color: '#fff' }}
                    aria-label={playing ? 'Pause video' : 'Play video'}
                />
                <Button
                    size="small"
                    type="text"
                    icon={muted || volume === 0 ? <MutedOutlined /> : <SoundOutlined />}
                    onClick={() => setMutedPreference(!muted)}
                    style={{ color: '#fff' }}
                    aria-label={muted ? 'Unmute video' : 'Mute video'}
                />
                <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={value => setVolumePreference(value)}
                    style={{ width: 96, margin: 0 }}
                    tooltip={{ formatter: null }}
                />
                <Button
                    size="small"
                    type={loop ? 'primary' : 'text'}
                    icon={<RetweetOutlined />}
                    onClick={() => setLoop(value => !value)}
                    style={{ color: loop ? undefined : '#fff' }}
                    aria-label={loop ? 'Disable loop' : 'Enable loop'}
                />
                <Button
                    size="small"
                    type="text"
                    icon={<FullscreenOutlined />}
                    onClick={() => {
                        const target = containerRef.current;
                        if (target && document.fullscreenElement !== target) {
                            target.requestFullscreen?.();
                        } else {
                            document.exitFullscreen?.();
                        }
                    }}
                    style={{ color: '#fff' }}
                    aria-label="Toggle fullscreen"
                />
            </div>
        </div>
    );
};

const PreviewActions = ({
    currentImage,
    actionItems,
    currentFolder,
    folderKeys,
    metadataVisible,
    onToggleMetadata,
    onDone,
}: {
    currentImage: FileDetails;
    actionItems: FileDetails[];
    currentFolder: string;
    folderKeys: string[];
    metadataVisible: boolean;
    onToggleMetadata: () => void;
    onDone: () => void;
}) => {
    const [moveOpen, setMoveOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | undefined>(currentImage.sourceFolder || currentFolder);
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState(getDefaultRenameValue(currentImage, actionItems.length > 1));
    const [busy, setBusy] = useState(false);
    const isCompactGroup = actionItems.length > 1;
    const treeData = useMemo(() => buildFolderTreeData(folderKeys), [folderKeys]);
    const itemLabel = isCompactGroup ? `${actionItems.length} compacted files` : currentImage.name;

    useEffect(() => {
        setRenameValue(getDefaultRenameValue(currentImage, isCompactGroup));
    }, [currentImage.url, isCompactGroup]);

    const runBatchAction = async (label: string, action: (image: FileDetails) => Promise<boolean>) => {
        setBusy(true);
        try {
            let completed = 0;
            for (const item of actionItems) {
                if (await action(item)) completed++;
            }
            if (completed === actionItems.length) {
                message.success(`${label} ${completed} file${completed === 1 ? '' : 's'}.`);
                onDone();
            } else {
                message.error(`${label} ${completed} of ${actionItems.length} files.`);
            }
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = () => {
        Modal.confirm({
            title: isCompactGroup ? 'Delete compacted files?' : 'Delete file?',
            content: isCompactGroup
                ? `Delete all ${actionItems.length} files in this compacted card? This cannot be undone.`
                : `Delete ${currentImage.name}? This cannot be undone.`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            zIndex: BASE_Z_INDEX + 300,
            onOk: () => runBatchAction('Deleted', image => ComfyAppApi.deleteImage(image.url)),
        });
    };

    const confirmRename = async () => {
        const nextValue = renameValue.trim();
        if (!nextValue || /[\\/]/.test(nextValue)) {
            message.error('Use a single file name without slashes.');
            return;
        }
        await runBatchAction('Renamed', image => ComfyAppApi.renameImage(
            image.url,
            buildRenamedFileName(image, nextValue, isCompactGroup)
        ));
        setRenameOpen(false);
    };

    const confirmMove = () => {
        if (!selectedFolder) return;
        runBatchAction('Moved', image => {
            const sourcePath = getFilePath(image, currentFolder);
            const targetPath = `${selectedFolder}/${image.name}`;
            if (sourcePath === targetPath) return Promise.resolve(true);
            return ComfyAppApi.moveImage(sourcePath, targetPath);
        }).then(() => setMoveOpen(false));
    };

    return (
        <>
            <div
                onClick={event => event.stopPropagation()}
                onMouseDown={event => event.stopPropagation()}
                style={{
                    width: 'min(92vw, 760px)',
                    minHeight: 44,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: 'rgba(0, 0, 0, 0.72)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    position: 'relative',
                    zIndex: BASE_Z_INDEX + 120,
                    userSelect: 'none',
                }}
            >
                <Button danger icon={<DeleteOutlined />} loading={busy} onMouseDown={event => event.stopPropagation()} onClick={confirmDelete} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }}>Delete</span>
                </Button>
                <Button icon={<FolderOpenOutlined />} loading={busy} onMouseDown={event => event.stopPropagation()} onClick={() => setMoveOpen(true)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }}>Move</span>
                </Button>
                <Button icon={<EditOutlined />} loading={busy} onMouseDown={event => event.stopPropagation()} onClick={() => setRenameOpen(true)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }}>Rename</span>
                </Button>
                <Button type={metadataVisible ? 'primary' : 'default'} icon={<InfoCircleOutlined />} onMouseDown={event => event.stopPropagation()} onClick={onToggleMetadata} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ cursor: 'pointer', userSelect: 'none' }}>Metadata</span>
                </Button>
            </div>
            <Modal
                open={renameOpen}
                zIndex={BASE_Z_INDEX + 300}
                title={isCompactGroup ? 'Rename compacted files' : 'Rename file'}
                okText="Rename"
                okButtonProps={{ loading: busy }}
                cancelButtonProps={{ disabled: busy }}
                onOk={confirmRename}
                onCancel={() => setRenameOpen(false)}
            >
                <Input
                    autoFocus
                    value={renameValue}
                    placeholder={isCompactGroup ? 'New base name' : 'New name'}
                    onChange={event => setRenameValue(event.target.value)}
                    onPressEnter={event => {
                        event.preventDefault();
                        confirmRename();
                    }}
                />
            </Modal>
            <Modal
                open={moveOpen}
                zIndex={BASE_Z_INDEX + 300}
                title={isCompactGroup ? 'Move compacted files' : 'Move file'}
                okText="Move"
                okButtonProps={{ disabled: !selectedFolder, loading: busy }}
                onOk={confirmMove}
                onCancel={() => setMoveOpen(false)}
            >
                <div style={{ marginBottom: 10, color: '#666' }}>
                    {isCompactGroup ? `Move all ${actionItems.length} files from this compacted card.` : `Move ${itemLabel}.`}
                </div>
                <Tree
                    blockNode
                    defaultExpandAll
                    selectedKeys={selectedFolder ? [selectedFolder] : []}
                    treeData={treeData}
                    onSelect={keys => setSelectedFolder(String(keys[0] ?? ''))}
                    style={{ maxHeight: 360, overflow: 'auto' }}
                />
            </Modal>
        </>
    );
};

const PreviewMetadataPanel = ({ image }: { image: FileDetails }) => {
    const { settings } = useGalleryContext();
    const [showRaw, setShowRaw] = useState(false);
    const meta = useMemo(() => parseComfyMetadata(image.metadata), [image.metadata]);
    const metadataItems = useMemo(() => Object.entries(meta).map(([key, value]) => ({
        label: <Typography.Text strong>{key}</Typography.Text>,
        children: (
            <Typography.Paragraph
                style={{ marginBottom: 0, whiteSpace: 'pre-line', wordBreak: 'break-word' }}
                ellipsis={typeof value === 'string' && value.length > 280 ? { rows: 5, expandable: 'collapsible' } : false}
            >
                {String(value)}
            </Typography.Paragraph>
        ),
        span: 1,
    })), [meta]);

    return (
        <Card
            size="small"
            title="Metadata"
            extra={<Button size="small" onClick={() => setShowRaw(value => !value)}>{showRaw ? 'Parsed' : 'Raw'}</Button>}
            style={{
                width: 560,
                maxWidth: '42vw',
                maxHeight: 'calc(92vh - 66px)',
                overflow: 'auto',
            }}
            bodyStyle={{ padding: 10 }}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
        >
            {showRaw ? (
                <ReactJsonView
                    theme={settings.darkMode ? "apathy" : "apathy:inverted"}
                    src={image.metadata || {}}
                    name={false}
                    collapsed={2}
                    enableClipboard
                    displayDataTypes={false}
                />
            ) : (
                <Descriptions
                    bordered
                    column={1}
                    size="small"
                    items={metadataItems}
                    styles={{
                        label: { width: 130 },
                        content: { maxWidth: 390 },
                    }}
                />
            )}
        </Card>
    );
};

const PreviewFrame = ({
    children,
    currentImage,
    actionItems,
    currentFolder,
    folderKeys,
    onDone,
}: {
    children: React.ReactNode;
    currentImage: FileDetails;
    actionItems: FileDetails[];
    currentFolder: string;
    folderKeys: string[];
    onDone: () => void;
}) => {
    const [metadataVisible, setMetadataVisible] = useState(false);

    return (
        <div
            style={{
                maxWidth: '96vw',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
            }}
        >
            <div
                style={{
                    maxHeight: 'calc(92vh - 58px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    width: '100%',
                }}
            >
                <div
                    style={{
                        maxWidth: metadataVisible ? 'calc(96vw - 572px)' : '96vw',
                        maxHeight: 'calc(92vh - 58px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {children}
                </div>
                {metadataVisible && <PreviewMetadataPanel image={currentImage} />}
            </div>
            <PreviewActions
                currentImage={currentImage}
                actionItems={actionItems}
                currentFolder={currentFolder}
                folderKeys={folderKeys}
                metadataVisible={metadataVisible}
                onToggleMetadata={() => setMetadataVisible(value => !value)}
                onDone={onDone}
            />
        </div>
    );
};

const GalleryImageGrid = () => {
    const {
        data,
        currentFolder,
        searchFileName,
        sortMethod,
        mediaFilter,
        dateRange,
        gridSize,
        setGridSize,
        autoSizer,
        setAutoSizer,
        imageInfoName,
        setImageInfoName,
        previewingVideo,
        setPreviewingVideo,
        showRawMetadata,
        setShowRawMetadata,
        settings,
        loading,
        runAsync,
        previewSize,
        mediaBatchSize,
        compactOutputs
    } = useGalleryContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<any>(null);
    const [visibleMediaLimit, setVisibleMediaLimit] = useState<number>(mediaBatchSize);
    const [pendingScrollTarget, setPendingScrollTarget] = useState<DateDividerRow | null>(null);
    const [previewActionGroup, setPreviewActionGroup] = useState<FileDetails[] | undefined>(undefined);
    const previewLayout = useMemo(
        () => getPreviewLayout(autoSizer.width, previewSize),
        [autoSizer.width, previewSize]
    );
    const imagesDetailsList = useMemo(() => {
        let list: FileDetails[] = getFolderMediaList(data, currentFolder);
        if (mediaFilter === 'images') {
            list = list.filter(imageInfo => imageInfo.type === 'image');
        } else if (mediaFilter === 'videos') {
            list = list.filter(imageInfo => imageInfo.type === 'media');
        }
        if (searchFileName && searchFileName.trim() !== "") {
            const searchTerm = searchFileName.toLowerCase();
            list = list.filter(imageInfo => imageInfo.name.toLowerCase().includes(searchTerm));
        }
        const [dateStart, dateEnd] = dateRange;
        if (dateStart || dateEnd) {
            list = list.filter(imageInfo => {
                const itemDate = imageInfo.timestamp
                    ? new Date(imageInfo.timestamp * 1000).toISOString().slice(0, 10)
                    : imageInfo.date;
                if (dateStart && itemDate < dateStart) return false;
                if (dateEnd && itemDate > dateEnd) return false;
                return true;
            });
        }
        if (compactOutputs) {
            list = compactRelatedOutputs(list);
        }
        if (sortMethod !== 'Name ↑' && sortMethod !== 'Name ↓') {
            list = list.sort((a, b) => (sortMethod === 'Newest' ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0)));
            if (!settings.showDateDivider) return list;
            const grouped: { [date: string]: FileDetails[] } = {};
            list.forEach(item => {
                const date = item.timestamp ? new Date(item.timestamp * 1000).toISOString().slice(0, 10) : 'Unknown';
                if (!grouped[date]) grouped[date] = [];
                grouped[date].push(item);
            });
            const result: FileDetails[] = [];
            Object.entries(grouped).forEach(([date, items]) => {
                const colCount = Math.max(1, previewLayout.columnCount || 1);
                for (let i = 0; i < colCount; i++) {
                    result.push({ name: date, type: 'divider' } as FileDetails);
                }
                result.push(...items);
                const remainder = items.length % colCount;
                if (remainder !== 0 && colCount > 1) {
                    for (let i = 0; i < colCount - remainder; i++) {
                        result.push({ type: 'empty-space' } as FileDetails);
                    }
                }
            });
            return result;
        }
        switch (sortMethod) {
            case 'Name ↑':
                return list.sort((a, b) => a.name.localeCompare(b.name));
            case 'Name ↓':
                return list.sort((a, b) => b.name.localeCompare(a.name));
            default:
                return list;
        }
    }, [currentFolder, data, mediaFilter, sortMethod, searchFileName, dateRange, compactOutputs, previewLayout.columnCount, settings.showDateDivider]);
    const visibleImagesDetailsList = useMemo(
        () => takeMediaBatch(imagesDetailsList, visibleMediaLimit),
        [imagesDetailsList, visibleMediaLimit]
    );
    const rowCount = useMemo(
        () => Math.ceil(visibleImagesDetailsList.length / Math.max(1, previewLayout.columnCount)),
        [visibleImagesDetailsList.length, previewLayout.columnCount]
    );
    const dateDividerRows = useMemo(() => {
        let mediaBefore = 0;
        return imagesDetailsList.reduce<DateDividerRow[]>((rows, item, index) => {
            if (isMediaItem(item)) mediaBefore++;
            if (item.type === 'divider' && index % previewLayout.columnCount === 0) {
                rows.push({
                    date: item.name,
                    rowIndex: Math.floor(index / previewLayout.columnCount),
                    mediaBefore,
                });
            }
            return rows;
        }, []);
    }, [imagesDetailsList, previewLayout.columnCount]);
    const totalMediaCount = useMemo(
        () => imagesDetailsList.filter(isMediaItem).length,
        [imagesDetailsList]
    );
    const visibleDateDividerRows = useMemo(() => {
        return dateDividerRows.filter(row =>
            visibleImagesDetailsList[row.rowIndex * previewLayout.columnCount]?.type === 'divider'
        );
    }, [dateDividerRows, visibleImagesDetailsList, previewLayout.columnCount]);
    const getRowHeight = useCallback((rowIndex: number) => {
        const firstItemInRow = visibleImagesDetailsList[rowIndex * previewLayout.columnCount];
        return firstItemInRow?.type === 'divider' ? DATE_DIVIDER_ROW_HEIGHT : previewLayout.rowHeight;
    }, [visibleImagesDetailsList, previewLayout.columnCount, previewLayout.rowHeight]);
    const loadedGridHeight = useMemo(() => {
        let total = 0;
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            total += getRowHeight(rowIndex);
        }
        return total;
    }, [rowCount, getRowHeight]);
    const getScrollOffsetForRow = useCallback((targetRowIndex: number) => {
        let offset = 0;
        for (let rowIndex = 0; rowIndex < targetRowIndex; rowIndex++) {
            offset += getRowHeight(rowIndex);
        }
        return offset;
    }, [getRowHeight]);

    const imagesUrlsLists = useMemo(() =>
        getPreviewItems(visibleImagesDetailsList).filter(isMediaItem).map(image => `${BASE_PATH}${image.url}`),
        [visibleImagesDetailsList]
    );

    useEffect(() => {
        setVisibleMediaLimit(mediaBatchSize);
        setPendingScrollTarget(null);
    }, [currentFolder, searchFileName, sortMethod, mediaFilter, dateRange, compactOutputs, mediaBatchSize]);

    useEffect(() => {
        if (pendingScrollTarget === null) return;
        const requiredVisibleLimit = Math.max(mediaBatchSize, pendingScrollTarget.mediaBefore + 1);
        const targetRow = visibleDateDividerRows.find(row => row.date === pendingScrollTarget.date);

        if (!targetRow) {
            setVisibleMediaLimit(currentLimit => {
                if (currentLimit < requiredVisibleLimit) return requiredVisibleLimit;
                if (currentLimit < totalMediaCount) return Math.min(totalMediaCount, currentLimit + mediaBatchSize);
                return currentLimit;
            });
            return;
        }

        const timeoutId = window.setTimeout(() => {
            gridRef.current?.resetAfterIndices?.({
                rowIndex: 0,
                columnIndex: 0,
                shouldForceUpdate: true,
            });
            window.requestAnimationFrame(() => {
                gridRef.current?.scrollTo?.({
                    scrollLeft: 0,
                    scrollTop: getScrollOffsetForRow(targetRow.rowIndex),
                });
                window.setTimeout(() => setPendingScrollTarget(null), 120);
            });
        }, 140);

        return () => window.clearTimeout(timeoutId);
    }, [pendingScrollTarget, visibleDateDividerRows, mediaBatchSize, totalMediaCount, getScrollOffsetForRow]);

    const scrollToDateRow = useCallback((target: DateDividerRow) => {
        const requiredVisibleLimit = Math.max(mediaBatchSize, target.mediaBefore + 1);
        setVisibleMediaLimit(currentLimit => Math.max(currentLimit, requiredVisibleLimit));
        setPendingScrollTarget(target);
    }, [mediaBatchSize]);

    const Cell = useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
        const index = rowIndex * previewLayout.columnCount + columnIndex;
        const image = visibleImagesDetailsList[index];
        if (!image) return null;
        if (image.type === 'divider') {
            if (columnIndex !== 0) return null;
            const currentDateIndex = dateDividerRows.findIndex(row => row.date === image.name);
            const previousDate = currentDateIndex > 0 ? dateDividerRows[currentDateIndex - 1] : undefined;
            const nextDate = currentDateIndex >= 0 && currentDateIndex < dateDividerRows.length - 1 ? dateDividerRows[currentDateIndex + 1] : undefined;
            const isJumping = pendingScrollTarget !== null;
            const jumpButtonStyle: React.CSSProperties = {
                height: 22,
                padding: '0 8px',
                fontSize: 11,
                lineHeight: '20px',
                fontWeight: 600,
                borderRadius: 4,
                border: '1px solid rgba(22, 119, 255, 0.42)',
            };
            return (
                <div
                    key={`divider-${index}`}
                    style={{
                        ...style,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        width: autoSizer.width,
                        gridColumn: `span ${previewLayout.columnCount}`,
                        background: 'transparent',
                        padding: 0,
                        height: DATE_DIVIDER_ROW_HEIGHT,
                        position: 'absolute',
                        zIndex: 2
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            position: 'relative',
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                flex: '0 0 auto',
                                fontWeight: 600,
                                fontSize: 12,
                                color: '#8c8c8c',
                                lineHeight: '18px',
                                padding: 0,
                            }}
                        >
                            {image.name}
                        </span>
                        {previousDate && (
                            <Button
                                size="small"
                                type="default"
                                loading={pendingScrollTarget?.date === previousDate.date}
                                disabled={isJumping}
                                style={jumpButtonStyle}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    scrollToDateRow(previousDate);
                                }}
                            >
                                ↑ Previous Day
                            </Button>
                        )}
                        {nextDate && (
                            <Button
                                size="small"
                                type="primary"
                                loading={pendingScrollTarget?.date === nextDate.date}
                                disabled={isJumping}
                                style={jumpButtonStyle}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    scrollToDateRow(nextDate);
                                }}
                            >
                                ↓ Next Day
                            </Button>
                        )}
                        {isJumping && (
                            <span
                                style={{
                                    flex: '0 0 auto',
                                    fontSize: 11,
                                    color: '#1677ff',
                                    fontWeight: 600,
                                }}
                            >
                                Loading day...
                            </span>
                        )}
                        <div
                            style={{
                                flex: 1,
                                borderBottom: '1px solid #888',
                                opacity: 0.22
                            }}
                        />
                    </div>
                </div>
            );
        }
        if (image.type === 'empty-space') {
            return (
                <div
                    key={`empty-space-${index}`}
                    style={{
                        ...style,
                        background: 'transparent'
                    }}
                />
            );
        }
        // Add folder info to drag data by wrapping ImageCard
        return (
            <div
                key={`div-${image.name}`}
                style={{
                    ...style,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <ImageCard
                    image={{
                        ...image,
                        dragFolder: image.sourceFolder || currentFolder
                    }}
                    key={image.name}
                    index={index}
                    cardWidth={previewLayout.cardWidth}
                    cardHeight={previewLayout.cardHeight}
                    onVideoClick={(selectedImage) => setPreviewingVideo(selectedImage?.name)}
                    onPreviewOpen={(selectedImage, group) => {
                        setPreviewActionGroup(group.length > 1 ? group : [selectedImage]);
                    }}
                />
            </div>
        );
    }, [autoSizer.width, visibleImagesDetailsList, setPreviewingVideo, currentFolder, previewLayout.columnCount, previewLayout.cardWidth, previewLayout.cardHeight, dateDividerRows, scrollToDateRow, pendingScrollTarget]);

    useEffect(() => {
        const { width, height } = autoSizer;
        const { columnCount } = getPreviewLayout(width, previewSize);
        const rowCount = Math.ceil(visibleImagesDetailsList.length / columnCount);
        setGridSize({ width, height, columnCount, rowCount });
    }, [autoSizer.width, autoSizer.height, visibleImagesDetailsList.length, previewSize]);

    // Memoized previewable images for InfoView navigation and rendering
    const previewableImages = useMemo(() =>
        getPreviewItems(visibleImagesDetailsList).filter(isMediaItem),
        [visibleImagesDetailsList]
    );

    const folderKeys = useMemo(() => Object.keys(data?.folders ?? {}), [data]);

    const getPreviewActionItems = useCallback((image: FileDetails) => {
        if (previewActionGroup?.some(item => item.url === image.url)) {
            return previewActionGroup;
        }
        const compactItem = visibleImagesDetailsList.find(item =>
            (item as CompactFileDetails).compactItems?.some(compactImage => compactImage.url === image.url)
        ) as CompactFileDetails | undefined;
        return compactItem?.compactItems?.length ? compactItem.compactItems : [image];
    }, [previewActionGroup, visibleImagesDetailsList]);

    const closePreviewOverlay = useCallback(() => {
        document.querySelector<HTMLElement>('.ant-image-preview-close')?.click();
        setPreviewingVideo(undefined);
        setImageInfoName(undefined);
        setPreviewActionGroup(undefined);
    }, [setImageInfoName, setPreviewingVideo]);

    const handlePreviewActionDone = useCallback(() => {
        closePreviewOverlay();
        runAsync();
    }, [closePreviewOverlay, runAsync]);

    const loadNextBatch = useCallback(() => {
        setVisibleMediaLimit(currentLimit => {
            const totalMediaCount = imagesDetailsList.filter(isMediaItem).length;
            if (currentLimit >= totalMediaCount) return currentLimit;
            return Math.min(totalMediaCount, currentLimit + mediaBatchSize);
        });
    }, [imagesDetailsList, mediaBatchSize]);

    const handleGridScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
        const scrollBottom = scrollTop + autoSizer.height;
        if (loadedGridHeight - scrollBottom <= previewLayout.rowHeight * 2) {
            loadNextBatch();
        }
    }, [autoSizer.height, loadedGridHeight, previewLayout.rowHeight, loadNextBatch]);

    // Helper to resolve image for Info/Image render
    const resolvePreviewableImage = useCallback((image: FileDetails | undefined, info: { current: number }) => {
        if (image) return image;
        let resolved: FileDetails | undefined;
        // Try forward
        for (let index = info.current; index < previewableImages.length; index++) {
            let current = previewableImages[index];
            resolved = current;
            break;
        }
        // Try backward
        if (!resolved) {
            for (let index = info.current; index > 0 && index > previewableImages.length; index--) {
                let current = previewableImages[index];
                resolved = current;
                break;
            }
        }
        // If still not found, return undefined
        if (!resolved) return undefined;

        setImageInfoName(resolved!.name);

        return resolved;
    }, [previewableImages, setImageInfoName]);

    const stopPropagation = useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    }, []);

    const customImageRender = useCallback((originalNode: React.ReactElement, info: { current: number }) => {
        let image = previewableImages[info.current];
        if (!image) return originalNode;
            const actionItems = getPreviewActionItems(image);
            const renderWithActions = (node: React.ReactNode) => (
                <PreviewFrame
                    currentImage={image}
                    actionItems={actionItems}
                    currentFolder={currentFolder}
                    folderKeys={folderKeys}
                    onDone={handlePreviewActionDone}
                >
                    {node}
                </PreviewFrame>
            );
            if (image.type === 'audio') {
                return renderWithActions(
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <h2 style={{ color: 'white', marginBottom: '24px', maxWidth: '80%', textAlign: 'center', wordWrap: 'break-word' }}>
                            {image.name}
                        </h2>
                        <audio
                            key={image.name}
                            style={{ maxWidth: '92vw', width: '80%' }}
                            src={`${BASE_PATH}${image.url}`}
                            autoPlay={true}
                            controls={true}
                            preload="none"
                            ref={el => {
                                if (el && !settings.autoPlayVideos) {
                                    el.pause(); el.currentTime = 0;
                                }
                            }}
                        />
                    </div>
                );
            }
            if (image.type === '3d') {
                return renderWithActions(
                    <div
                        style={{ width: '80vw', maxWidth: 1000, height: '70vh', cursor: 'grab' }}
                        onMouseDown={stopPropagation}
                        onTouchStart={stopPropagation}
                    >
                        <ModelViewer url={`${BASE_PATH}${image.url}`} type={image.name.split('.').pop()?.toLowerCase() || ''} />
                    </div>
                );
            }
            if (image.type === 'media') {
                return renderWithActions(<PreviewVideo image={image} />);
            }
            return renderWithActions(
                <img
                    src={`${BASE_PATH}${image.url}`}
                    alt={image.name}
                    style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(92vh - 66px)',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: 6,
                        userSelect: 'none',
                    }}
                />
            );
    }, [
        previewableImages,
        getPreviewActionItems,
        currentFolder,
        folderKeys,
        handlePreviewActionDone,
        settings.autoPlayVideos,
        stopPropagation
    ]);

    // Memoized onChange for InfoView
    const infoOnChange = useCallback((current: number, prevCurrent: number) => {
        setImageInfoName(previewableImages[current]?.name);
    }, [setImageInfoName, previewableImages]);

    // Memoized afterOpenChange for InfoView
    const infoAfterOpenChange = useCallback((open: boolean) => {
        if (!open) setImageInfoName(undefined);
    }, [setImageInfoName]);



    // Memoized onChange for video preview
    const videoOnChange = useCallback((current: number, prevCurrent: number) => {
        const t = previewableImages[current]?.type;
        if (t == "media" || t == "audio" || t == "3d") {
            setPreviewingVideo(previewableImages[current]?.name);
        } else {
            setPreviewingVideo(undefined);
        }
    }, [setPreviewingVideo, previewableImages]);

    // Memoized current index for InfoView
    const previewableCurrentIndex = useMemo(() => {
        let index = previewableImages.findIndex(img => img.name === imageInfoName);
        if (index < 0) {
            return undefined;
        } else {
            return index;
        }
    },
        [previewableImages, imageInfoName]
    );

    return (
        <div id="imagesBox" style={{ width: '100%', height: '100%', position: 'relative', overflowX: 'hidden' }} ref={containerRef}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(30,30,30,0.5)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Spin size="large" tip="Loading..." />
                </div>
            )}
            <Image.PreviewGroup
                // key={imagesUrlsLists.length}
                items={imagesUrlsLists}
                preview={(imageInfoName != undefined) ? {
                    current: previewableCurrentIndex,
                    imageRender: customImageRender,
                    toolbarRender: () => null,
                    onChange: infoOnChange,
                    afterOpenChange: infoAfterOpenChange,
                    destroyOnClose: true
                } : {
                    current: previewableCurrentIndex,
                    onChange: videoOnChange,
                    imageRender: customImageRender,
                    toolbarRender: () => previewingVideo != undefined ? null : undefined,
                    destroyOnClose: true,
                    afterOpenChange(open) {
                        if (!open) {
                            setPreviewingVideo(undefined);
                            setPreviewActionGroup(undefined);
                        }
                    },
                }}
            >
                {visibleImagesDetailsList.length === 0 ? (
                    <Empty
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)"
                        }}
                        description={"No images found"}
                    />
                ) : (
                    <AutoSizer>
                        {({ width, height }) => {
                            if (autoSizer.width !== width || autoSizer.height !== height) {
                                setTimeout(() => setAutoSizer({ width, height }), 0);
                                return <div style={{ width, height }} />;
                            }
                            const layout = getPreviewLayout(width, previewSize);
                            return (
                                <VariableSizeGrid
                                    ref={gridRef}
                                    key={`${previewSize}-${layout.columnCount}`}
                                    columnCount={layout.columnCount}
                                    rowCount={rowCount}
                                    columnWidth={() => layout.columnWidth}
                                    rowHeight={getRowHeight}
                                    width={width}
                                    height={height}
                                    className={"grid-element"}
                                    onScroll={handleGridScroll}
                                    style={{
                                        display: "flex",
                                        alignContent: "center",
                                        justifyContent: "center",
                                        overflowX: "hidden"
                                    }}
                                >
                                    {Cell}
                                </VariableSizeGrid>
                            );
                        }}
                    </AutoSizer>
                )}
            </Image.PreviewGroup>
        </div>
    );
};

export default GalleryImageGrid;
