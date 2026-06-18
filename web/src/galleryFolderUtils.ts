import type { FileDetails, FilesTree } from './types';

export type GalleryFileDetails = FileDetails & { sourceFolder?: string };

export function getFolderKeys(data?: FilesTree): string[] {
    return Object.keys(data?.folders ?? {}).sort();
}

export function getRootFolders(data?: FilesTree): string[] {
    const roots = new Set<string>();
    getFolderKeys(data).forEach(folder => {
        const root = folder.split('/').filter(Boolean)[0];
        if (root) roots.add(root);
    });
    return Array.from(roots).sort();
}

export function getChildFolders(data: FilesTree | undefined, parentFolder: string): string[] {
    const children = new Set<string>();
    const prefix = parentFolder ? `${parentFolder}/` : '';

    getFolderKeys(data).forEach(folder => {
        if (parentFolder && folder !== parentFolder && !folder.startsWith(prefix)) return;

        const remainder = parentFolder ? folder.slice(prefix.length) : folder;
        const childName = remainder.split('/').filter(Boolean)[0];
        if (childName) {
            children.add(parentFolder ? `${prefix}${childName}` : childName);
        }
    });

    return Array.from(children).filter(folder => folder !== parentFolder).sort();
}

export function getDescendantFolderKeys(data: FilesTree | undefined, folder: string): string[] {
    const prefix = `${folder}/`;
    return getFolderKeys(data).filter(key => key === folder || key.startsWith(prefix));
}

export function getFolderMediaList(data: FilesTree | undefined, folder: string, includeSubfolders = true): GalleryFileDetails[] {
    const folderKeys = includeSubfolders ? getDescendantFolderKeys(data, folder) : [folder];
    return folderKeys.flatMap(sourceFolder =>
        Object.values(data?.folders?.[sourceFolder] ?? {}).map(item => ({
            ...item,
            sourceFolder,
        }))
    );
}

export function getFolderLabel(folder: string): string {
    return folder.split('/').filter(Boolean).pop() || folder;
}
