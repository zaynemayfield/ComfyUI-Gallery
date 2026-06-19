import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import useSize from 'ahooks/lib/useSize';
import useRequest from 'ahooks/lib/useRequest/src/useRequest';
import useAsyncEffect from 'ahooks/lib/useAsyncEffect';
import { useEventListener, useLocalStorageState } from 'ahooks';
import type { FileDetails, FilesTree } from './types';
import type { AutoCompleteProps } from 'antd/es/auto-complete';
import { ComfyAppApi, BASE_PATH, OPEN_BUTTON_ID } from './ComfyAppApi';
import { useClickAway } from 'ahooks';
import { getDescendantFolderKeys, getFolderMediaList, getRootFolders } from './galleryFolderUtils';
import { matchesGallerySearch, type GallerySearchScope } from './gallerySearch';

function getImages(): Promise<FilesTree> {
    return new Promise(async (resolve, reject) => {
        try {
            let settings = DEFAULT_SETTINGS;
            try {
                const raw = localStorage.getItem('comfy-ui-gallery-settings');
                if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
            } catch { }

            let request = await ComfyAppApi.fetchImages(settings.relativePath);
            let json: FilesTree = await request.json();
            resolve(json);
        } catch (error) {
            reject(error);
        }
    });
}

export interface SettingsState {
    relativePath: string;
    buttonBoxQuery: string;
    buttonLabel: string;
    showDateDivider: boolean;
    floatingButton: boolean;
    autoPlayVideos: boolean;
    hideOpenButton: boolean;
    darkMode: boolean;
    galleryShortcut: boolean;
    expandAllFolders: boolean;
    disableLogs: boolean;
    usePollingObserver: boolean;
    scanExtensions: string[];
    imageThumbFit: 'width' | 'height';
    videoThumbFit: 'width' | 'height';
}

export type GalleryMediaFilter = 'all' | 'images' | 'videos';
export type GalleryPreviewSize = 'small' | 'medium' | 'large';
export type GalleryDateRange = [string | null, string | null];

export const DEFAULT_SETTINGS: SettingsState = {
    relativePath: './',
    buttonBoxQuery: 'div.flex.gap-2.mx-2',
    buttonLabel: 'Launch ComfyUI Gallery',
    showDateDivider: true,
    floatingButton: false,
    autoPlayVideos: false,
    hideOpenButton: false,
    darkMode: false,
    galleryShortcut: true,
    expandAllFolders: true,
    disableLogs: false,
    usePollingObserver: false,
    scanExtensions: ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'gif', 'webm', 'mov', 'wav', 'mp3', 'm4a', 'flac', 'obj', 'glb', 'gltf', 'fbx', 'stl', 'usd', 'usdz'],
    imageThumbFit: 'width',
    videoThumbFit: 'height',
};
export const STORAGE_KEY = 'comfy-ui-gallery-settings';

export interface GalleryContextType {
    currentFolder: string;
    setCurrentFolder: Dispatch<SetStateAction<string>>;
    searchFileName: string;
    setSearchFileName: Dispatch<SetStateAction<string>>;
    searchScope: GallerySearchScope;
    setSearchScope: Dispatch<SetStateAction<GallerySearchScope>>;
    showDateDivider: boolean;
    setShowDateDivider: Dispatch<SetStateAction<boolean>>;
    showSettings: boolean;
    setShowSettings: Dispatch<SetStateAction<boolean>>;
    sortMethod: 'Newest' | 'Oldest' | 'Name ↑' | 'Name ↓';
    setSortMethod: Dispatch<SetStateAction<'Newest' | 'Oldest' | 'Name ↑' | 'Name ↓'>>;
    mediaFilter: GalleryMediaFilter;
    setMediaFilter: Dispatch<SetStateAction<GalleryMediaFilter>>;
    dateRange: GalleryDateRange;
    setDateRange: Dispatch<SetStateAction<GalleryDateRange>>;
    previewSize: GalleryPreviewSize;
    setPreviewSize: Dispatch<SetStateAction<GalleryPreviewSize>>;
    mediaBatchSize: 20 | 40 | 60;
    setMediaBatchSize: Dispatch<SetStateAction<20 | 40 | 60>>;
    compactOutputs: boolean;
    setCompactOutputs: Dispatch<SetStateAction<boolean>>;
    includeSubfolders: boolean;
    setIncludeSubfolders: Dispatch<SetStateAction<boolean>>;
    imageInfoName: string | undefined;
    setImageInfoName: Dispatch<SetStateAction<string | undefined>>;
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    previewingVideo: string | undefined;
    setPreviewingVideo: Dispatch<SetStateAction<string | undefined>>;
    size: ReturnType<typeof useSize>;
    imagesBoxSize: ReturnType<typeof useSize>;
    data: FilesTree | undefined;
    error: any;
    loading: boolean;
    runAsync: () => Promise<any>;
    mutate: (data?: FilesTree | ((oldData?: FilesTree | undefined) => FilesTree | undefined) | undefined) => void;
    gridSize: { width: number; height: number; columnCount: number; rowCount: number };
    setGridSize: Dispatch<SetStateAction<{ width: number; height: number; columnCount: number; rowCount: number }>>;
    autoSizer: { width: number; height: number };
    setAutoSizer: Dispatch<SetStateAction<{ width: number; height: number }>>;
    imagesDetailsList: FileDetails[];
    imagesUrlsLists: string[];
    imagesAutoCompleteNames: NonNullable<AutoCompleteProps['options']>;
    autoCompleteOptions: NonNullable<AutoCompleteProps['options']>;
    setAutoCompleteOptions: React.Dispatch<React.SetStateAction<NonNullable<AutoCompleteProps['options']>>>;
    settings: SettingsState;
    setSettings: (v: SettingsState) => void;
    selectedImages: string[];
    setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
    multiSelectMode: boolean;
    setMultiSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
    siderCollapsed: boolean;
    setSiderCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: React.ReactNode }) {
    const [currentFolder, setCurrentFolder] = useState("output");
    const [searchFileName, setSearchFileName] = useState("");
    const [searchScope, setSearchScope] = useState<GallerySearchScope>('all');
    const [showDateDivider, setShowDateDivider] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [sortMethod, setSortMethod] = useState<'Newest' | 'Oldest' | 'Name ↑' | 'Name ↓'>("Newest");
    const [mediaFilter, setMediaFilter] = useState<GalleryMediaFilter>('all');
    const [dateRange, setDateRange] = useState<GalleryDateRange>([null, null]);
    const [previewSize, setPreviewSize] = useState<GalleryPreviewSize>('medium');
    const [mediaBatchSize, setMediaBatchSize] = useState<20 | 40 | 60>(20);
    const [compactOutputs, setCompactOutputs] = useState(false);
    const [includeSubfolders, setIncludeSubfolders] = useState(true);
    const [imageInfoName, setImageInfoName] = useState<string | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const [previewingVideo, setPreviewingVideo] = useState<string | undefined>(undefined);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [siderCollapsed, setSiderCollapsed] = useState(true);
    const size = useSize(document.querySelector('body'));
    const imagesBoxSize = useSize(document.querySelector('#imagesBox'));
    const { data, error, loading, runAsync, mutate } = useRequest(getImages, { manual: true });
    const [gridSize, setGridSize] = useState({ width: 1000, height: 600, columnCount: 1, rowCount: 1 });
    const [autoSizer, setAutoSizer] = useState({ width: 1000, height: 600 });
    const [autoCompleteOptions, setAutoCompleteOptions] = useState<NonNullable<AutoCompleteProps['options']>>([]);
    const [settingsState, setSettings] = useLocalStorageState<SettingsState>(STORAGE_KEY, {
        defaultValue: DEFAULT_SETTINGS,
        listenStorageChange: true,
    });
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
        if (data && data.folders) {
            const keys = Object.keys(data.folders);
            if (keys.length > 0 && getDescendantFolderKeys(data, currentFolder).length === 0) {
                setCurrentFolder(getRootFolders(data)[0] || keys.sort()[0]);
            }
        }
    }, [data, currentFolder]);

    useAsyncEffect(async () => {
        // Fetch saved server settings and merge with defaults
        try {
            const serverSettings = await ComfyAppApi.fetchSettings();
            if (serverSettings && Object.keys(serverSettings).length > 0) {
                // Merge server settings into defaults, but only override when value is not null/undefined
                const merged: any = { ...DEFAULT_SETTINGS };
                Object.keys(serverSettings).forEach((k) => {
                    const v = (serverSettings as any)[k];
                    if (v !== null && v !== undefined) merged[k] = v;
                });
                setSettings(merged as SettingsState);
            }
        } catch (e) { }
        finally {
            setSettingsLoaded(true);
        }

        ComfyAppApi.onFileChange((event) => {
            updateImages(event.detail);
        });

        ComfyAppApi.onUpdate((event) => {
            updateImages(event.detail);
        });

        ComfyAppApi.onClear(() => {
            mutate({ folders: {} });
        });
    }, []);

    // Watch for changes to settingsState.relativePath, disableLogs, usePollingObserver and update monitoring and data
    // Start monitoring when settings change
    const saveSettings = (newSettings: SettingsState) => {
        setSettings(newSettings);
        ComfyAppApi.saveSettings(newSettings);
    };

    useEffect(() => {
        if (settingsLoaded && settingsState?.relativePath) {
            let cancelled = false;
            setCurrentFolder("");
            const syncGalleryRoot = async () => {
                await ComfyAppApi.startMonitoring(
                    settingsState.relativePath,
                    settingsState.disableLogs,
                    settingsState.usePollingObserver,
                    settingsState.scanExtensions // Pass extensions here
                );
                if (!cancelled) await runAsync();
            };
            syncGalleryRoot();
            return () => {
                cancelled = true;
            };
        }
    }, [settingsLoaded, settingsState?.relativePath, settingsState?.disableLogs, settingsState?.usePollingObserver, JSON.stringify(settingsState?.scanExtensions)]);

    // Memoized list of all images in the current folder
    const imagesDetailsList = useMemo(() => {
        let list: FileDetails[] = getFolderMediaList(data, currentFolder, includeSubfolders);
        if (mediaFilter === 'images') {
            list = list.filter(imageInfo => imageInfo.type === 'image');
        } else if (mediaFilter === 'videos') {
            list = list.filter(imageInfo => imageInfo.type === 'media');
        }
        if (searchFileName && searchFileName.trim() !== "") {
            list = list.filter(imageInfo => matchesGallerySearch(imageInfo, searchFileName, searchScope));
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
        if (sortMethod !== 'Name ↑' && sortMethod !== 'Name ↓') {
            list = list.sort((a, b) => (sortMethod === 'Newest' ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0)));
            if (!showDateDivider) return list;
            const grouped: { [date: string]: FileDetails[] } = {};
            list.forEach(item => {
                const date = item.timestamp ? new Date(item.timestamp * 1000).toISOString().slice(0, 10) : 'Unknown';
                if (!grouped[date]) grouped[date] = [];
                grouped[date].push(item);
            });
            const result: FileDetails[] = [];
            Object.entries(grouped).forEach(([date, items]) => {
                const colCount = Math.max(1, gridSize.columnCount || 1);
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
    }, [currentFolder, data, includeSubfolders, mediaFilter, sortMethod, searchFileName, searchScope, dateRange, gridSize.columnCount, showDateDivider]);

    // Memoized list of image URLs for preview
    const imagesUrlsLists = useMemo(() =>
        imagesDetailsList.filter(image => image.type === "image" || image.type === "media" || image.type === "audio" || image.type === "3d").map(image => `${BASE_PATH}${image.url}`),
        [imagesDetailsList]
    );

    // Memoized autocomplete options for image names
    const imagesAutoCompleteNames = useMemo<NonNullable<AutoCompleteProps['options']>>(() => {
        let filtered = imagesDetailsList.filter(image => (image.type === "image" || image.type === "media" || image.type === "audio" || image.type === "3d") && typeof image.name === 'string');
        if (sortMethod === 'Name ↑') {
            filtered = filtered.sort((a, b) => (a.name as string).localeCompare(b.name as string));
        } else if (sortMethod === 'Name ↓') {
            filtered = filtered.sort((a, b) => (b.name as string).localeCompare(a.name as string));
        } else if (sortMethod === 'Newest') {
            filtered = filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } else if (sortMethod === 'Oldest') {
            filtered = filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        }
        return filtered.map(image => ({ value: image.name as string, label: image.name as string }));
    }, [imagesDetailsList, sortMethod]);

    // Update images in the gallery data (data: FilesTree)
    function updateImages(changes: any) {
        if (!changes || !changes.folders) {
            console.warn("No valid changes data received.");
            return;
        }
        mutate((oldData: FilesTree | undefined) => {
            if (!oldData || !oldData.folders) return oldData;
            // Deep copy folders to avoid direct mutation
            const folders = { ...oldData.folders };
            let changed = false;
            for (const folderName in changes.folders) {
                const folderChanges = changes.folders[folderName];
                if (!folders[folderName] && folderChanges) {
                    folders[folderName] = {};
                    changed = true;
                }
                if (folders[folderName]) {
                    for (const filename in folderChanges) {
                        const fileChange = folderChanges[filename];
                        if (filename === "__folder__" && fileChange.action === "remove") {
                            delete folders[folderName];
                            changed = true;
                            continue;
                        }
                        switch (fileChange.action) {
                            case 'create':
                                folders[folderName][filename] = { ...fileChange };
                                changed = true;
                                break;
                            case 'update':
                                if (folders[folderName][filename]) {
                                    Object.assign(folders[folderName][filename], fileChange);
                                    changed = true;
                                }
                                break;
                            case 'remove':
                                if (folders[folderName][filename]) {
                                    delete folders[folderName][filename];
                                    changed = true;
                                    if (Object.keys(folders[folderName]).length === 0) {
                                        delete folders[folderName];
                                    }
                                }
                                break;
                            default:
                                console.warn(`Unknown action: ${fileChange.action}`);
                        }
                    }
                } else {
                    console.warn(`Change for non-existent folder: ${folderName}`);
                    return oldData;
                }
            }
            if (changed) {
                return { ...oldData, folders };
            }
            return oldData;
        });
    }

    const [imageCards, setImageCards] = useState(document.querySelectorAll(".image-card"));
    const [folders, setFolders] = useState(document.querySelectorAll('[role="treeitem"], .folder'));
    const [selectedImagesActionButtons, setSelectedImagesActionButtons] = useState(document.querySelectorAll(".selectedImagesActionButton"));

    useEffect(() => {
        setImageCards(document.querySelectorAll(".image-card"));
    }, [imagesDetailsList]);
    useEffect(() => {
        setFolders(document.querySelectorAll('[role="treeitem"], .folder'));
    }, [imagesDetailsList, currentFolder]);
    useEffect(() => {
        setSelectedImagesActionButtons(document.querySelectorAll(".selectedImagesActionButton"));
    }, [selectedImages]);

    useClickAway((event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.selectedImagesActionButton, .ant-modal, .ant-popover, .ant-picker-dropdown')) return;
        setSelectedImages([]);
    }, [...imageCards, ...folders, ...selectedImagesActionButtons])

    useEventListener('keydown', (event) => {
        if (settingsState?.galleryShortcut && event.code == "KeyG" && event.ctrlKey) {
            try {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                document.getElementById(OPEN_BUTTON_ID)?.click();
            } catch { }
        }
    });

    const value = useMemo(() => ({
        currentFolder, setCurrentFolder,
        searchFileName, setSearchFileName,
        searchScope, setSearchScope,
        showDateDivider, setShowDateDivider,
        showSettings, setShowSettings,
        sortMethod, setSortMethod,
        mediaFilter, setMediaFilter,
        dateRange, setDateRange,
        previewSize, setPreviewSize,
        mediaBatchSize, setMediaBatchSize,
        compactOutputs, setCompactOutputs,
        includeSubfolders, setIncludeSubfolders,
        imageInfoName, setImageInfoName,
        open, setOpen,
        previewingVideo, setPreviewingVideo,
        size, imagesBoxSize,
        data, error, loading, runAsync, mutate,
        gridSize, setGridSize,
        autoSizer, setAutoSizer,
        imagesDetailsList,
        imagesUrlsLists,
        imagesAutoCompleteNames,
        autoCompleteOptions,
        setAutoCompleteOptions,
        settings: settingsState || DEFAULT_SETTINGS,
        setSettings: saveSettings,
        selectedImages,
        setSelectedImages,
        multiSelectMode,
        setMultiSelectMode,
        siderCollapsed,
        setSiderCollapsed,
    }), [
        currentFolder,
        searchFileName,
        searchScope,
        showDateDivider,
        showSettings,
        sortMethod,
        mediaFilter,
        dateRange,
        previewSize,
        mediaBatchSize,
        compactOutputs,
        includeSubfolders,
        imageInfoName,
        open,
        previewingVideo,
        size,
        imagesBoxSize,
        data,
        error,
        loading,
        runAsync,
        mutate,
        gridSize,
        autoSizer,
        imagesDetailsList,
        imagesUrlsLists,
        imagesAutoCompleteNames,
        autoCompleteOptions,
        settingsState,
        saveSettings,
        selectedImages,
        setSelectedImages,
        multiSelectMode,
        setMultiSelectMode,
        siderCollapsed,
        setSiderCollapsed,
    ]);

    return <GalleryContext.Provider
        value={value}
    >
        {children}
    </GalleryContext.Provider>;
}

export function useGalleryContext() {
    const ctx = useContext(GalleryContext);
    if (!ctx) throw new Error('useGalleryContext must be used within a GalleryProvider');
    return ctx;
}
