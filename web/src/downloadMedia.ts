import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BASE_PATH } from './ComfyAppApi';
import type { FileDetails } from './types';

const getFolderName = (item: FileDetails) => item.sourceFolder?.split(/[\\/]/).filter(Boolean).join('/') || '';

const getZipPath = (item: FileDetails, seenNames: Set<string>) => {
    if (!seenNames.has(item.name)) {
        seenNames.add(item.name);
        return item.name;
    }

    const folder = getFolderName(item);
    return folder ? `${folder}/${item.name}` : item.name;
};

export async function downloadMediaFiles(items: FileDetails[], zipName = 'comfyui-gallery-download.zip') {
    const uniqueItems = Array.from(new Map(items.map(item => [item.url, item])).values());
    if (uniqueItems.length === 0) return 0;

    if (uniqueItems.length === 1) {
        const item = uniqueItems[0];
        const response = await fetch(`${BASE_PATH}${item.url}`);
        if (!response.ok) throw new Error(`Failed to download ${item.name}`);
        saveAs(await response.blob(), item.name);
        return 1;
    }

    const zip = new JSZip();
    const seenNames = new Set<string>();
    await Promise.all(uniqueItems.map(async item => {
        const response = await fetch(`${BASE_PATH}${item.url}`);
        if (!response.ok) throw new Error(`Failed to download ${item.name}`);
        zip.file(getZipPath(item, seenNames), await response.blob());
    }));
    saveAs(await zip.generateAsync({ type: 'blob' }), zipName);
    return uniqueItems.length;
}

