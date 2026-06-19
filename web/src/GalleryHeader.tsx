import { useEffect, useMemo, useRef, useState } from 'react';
import { Flex, AutoComplete, Button, DatePicker, Modal, Segmented, Select, message, Popconfirm, Tooltip, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { CloseOutlined, CloseSquareFilled, DeleteOutlined, FolderOpenOutlined, FolderOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import DownloadOutlined from '@ant-design/icons/lib/icons/DownloadOutlined';
import { useGalleryContext } from './GalleryContext';
import { useDebounce, useCountDown } from 'ahooks';
import Typography from 'antd/es/typography/Typography';
import { ComfyAppApi } from './ComfyAppApi';
import GalleryFolderBar from './GalleryFolderBar';
import type { FileDetails } from './types';
import { downloadMediaFiles } from './downloadMedia';

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

const getGalleryRelativePath = (url: string) => {
    const prefix = '/static_gallery/';
    return url.startsWith(prefix) ? url.slice(prefix.length) : url;
};

const getFileNameFromPath = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path;
const getDateString = (value: string | string[]) => Array.isArray(value) ? value[0] : value;
const isBulkMediaItem = (item: FileDetails) => (
    item.type === 'image' || item.type === 'media' || item.type === 'audio' || item.type === '3d'
);
const getCompactGroupKey = (item: FileDetails) => {
    const stem = item.name.replace(/\.[^/.]+$/, "");
    return stem.replace(/-audio$/i, "").toLowerCase();
};

const GalleryHeader = () => {
    const {
        setShowSettings,
        setSearchFileName,
        searchScope, setSearchScope,
        sortMethod, setSortMethod,
        mediaFilter, setMediaFilter,
        dateRange, setDateRange,
        previewSize, setPreviewSize,
        mediaBatchSize, setMediaBatchSize,
        compactOutputs, setCompactOutputs,
        includeSubfolders, setIncludeSubfolders,
        imagesAutoCompleteNames,
        autoCompleteOptions, setAutoCompleteOptions,
        setOpen,
        selectedImages, setSelectedImages,
        multiSelectMode, setMultiSelectMode,
        settings, setSettings,
        data,
        mutate,
        currentFolder,
        imagesDetailsList,
    } = useGalleryContext();

    const [search, setSearch] = useState("");
    const [dateSort, setDateSort] = useState<'Newest' | 'Oldest'>('Newest');
    const [nameSort, setNameSort] = useState<'Name ↑' | 'Name ↓'>('Name ↑');
    const [showFolderBar, setShowFolderBar] = useState(true);
    const [showClose, setShowClose] = useState(false);
    const [targetDate, setTargetDate] = useState<number>();
    const [countdown] = useCountDown({
        targetDate,
        onEnd: () => {
            setOpen(false);
            setShowClose(false);
            setTargetDate(undefined);
        },
    });
    const dragCounter = useRef(0);

    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [moveTargetFolder, setMoveTargetFolder] = useState<string | undefined>(currentFolder);
    const [bulkMoving, setBulkMoving] = useState(false);
    const [bulkDownloading, setBulkDownloading] = useState(false);
    const sortButtonBaseStyle = {
        minWidth: 82,
        borderColor: '#e5e5e5',
        background: '#f5f5f5',
        color: '#333',
        boxShadow: 'none',
    };
    const sortButtonActiveStyle = {
        background: '#fff',
        borderColor: '#d9d9d9',
        color: '#111',
        fontWeight: 600,
    };

    // Show close button only when dragging
    useEffect(() => {
        const onDragStart = () => setShowClose(true);
        const onDragEnd = () => {
            setShowClose(false);
            setTargetDate(undefined);
        };
        window.addEventListener('dragstart', onDragStart);
        window.addEventListener('dragend', onDragEnd);
        return () => {
            window.removeEventListener('dragstart', onDragStart);
            window.removeEventListener('dragend', onDragEnd);
        };
    }, []);

    // Debounce the search input to prevent lag
    const debouncedSearch = useDebounce(search, { wait: 100 });

    useEffect(() => {
        setSearchFileName(debouncedSearch);

        if (!debouncedSearch || debouncedSearch.length == 0) {
            setAutoCompleteOptions(imagesAutoCompleteNames);
        } else {
            setAutoCompleteOptions(
                imagesAutoCompleteNames.filter(opt =>
                    typeof opt.value === 'string' && opt.value.toLowerCase().includes(debouncedSearch.toLowerCase())
                )
            );
        }
    }, [debouncedSearch, imagesAutoCompleteNames, setAutoCompleteOptions]);

    const toggleDateSort = () => {
        const nextSort = dateSort === 'Newest' ? 'Oldest' : 'Newest';
        setDateSort(nextSort);
        setSortMethod(nextSort);
    };

    const toggleNameSort = () => {
        const nextSort = nameSort === 'Name ↑' ? 'Name ↓' : 'Name ↑';
        setNameSort(nextSort);
        setSortMethod(nextSort);
    };

    const folderTreeData = buildFolderTreeData(Object.keys(data?.folders ?? {}));
    const selectableImages = imagesDetailsList.filter(image =>
        image.type === 'image' || image.type === 'media' || image.type === 'audio' || image.type === '3d'
    );
    const compactGroupByUrl = useMemo(() => {
        const groups = new Map<string, FileDetails[]>();
        selectableImages.filter(isBulkMediaItem).forEach(image => {
            const key = getCompactGroupKey(image);
            groups.set(key, [...(groups.get(key) ?? []), image]);
        });

        const byUrl = new Map<string, FileDetails[]>();
        groups.forEach(group => {
            if (group.length <= 1) return;
            group.forEach(image => byUrl.set(image.url, group));
        });
        return byUrl;
    }, [selectableImages]);

    const clearMultiSelect = () => {
        setSelectedImages([]);
        setMultiSelectMode(false);
    };

    const selectAllVisible = () => {
        setSelectedImages(Array.from(new Set(selectableImages.map(image => image.url))));
        setMultiSelectMode(selectableImages.length > 0);
    };

    const selectedItemByUrl = useMemo(() => {
        const byUrl = new Map<string, FileDetails>();
        selectableImages.forEach(image => byUrl.set(image.url, image));
        return byUrl;
    }, [selectableImages]);

    const buildStaticUrl = (folder: string, fileName: string) => (
        `/static_gallery/${folder ? `${folder}/` : ''}${fileName}`.replace(/\\/g, '/')
    );

    const applyDeletedUrls = (urls: string[]) => {
        const urlSet = new Set(urls);
        mutate(oldData => {
            if (!oldData?.folders) return oldData;
            const folders = { ...oldData.folders };
            urlSet.forEach(url => {
                const item = selectedItemByUrl.get(url);
                if (!item) return;
                const folder = item.sourceFolder || currentFolder;
                folders[folder] = { ...(folders[folder] ?? {}) };
                delete folders[folder][item.name];
            });
            return { ...oldData, folders };
        });
    };

    const applyMovedUrls = (urls: string[], targetFolder: string) => {
        const urlSet = new Set(urls);
        mutate(oldData => {
            if (!oldData?.folders) return oldData;
            const folders = { ...oldData.folders };
            folders[targetFolder] = { ...(folders[targetFolder] ?? {}) };
            urlSet.forEach(url => {
                const item = selectedItemByUrl.get(url);
                if (!item) return;
                const sourceFolder = item.sourceFolder || currentFolder;
                folders[sourceFolder] = { ...(folders[sourceFolder] ?? {}) };
                delete folders[sourceFolder][item.name];
                folders[targetFolder][item.name] = {
                    ...item,
                    url: buildStaticUrl(targetFolder, item.name),
                    sourceFolder: targetFolder,
                };
            });
            return { ...oldData, folders };
        });
    };

    const resolveSelectedUrlsForCompact = (actionLabel: 'delete' | 'move' | 'download') => {
        if (!compactOutputs) return Promise.resolve(selectedImages);

        const relatedUrls = new Set<string>();
        selectedImages.forEach(url => {
            const group = compactGroupByUrl.get(url);
            group?.forEach(image => relatedUrls.add(image.url));
        });

        const expandedUrls = Array.from(new Set([...selectedImages, ...relatedUrls]));
        const additionalCount = expandedUrls.length - selectedImages.length;
        if (additionalCount <= 0) return Promise.resolve(selectedImages);

        return new Promise<string[]>((resolve) => {
            Modal.confirm({
                title: `${actionLabel === 'delete' ? 'Delete' : actionLabel === 'move' ? 'Move' : 'Download'} compacted related files?`,
                content: `Compact mode is on. ${selectedImages.length} selected file${selectedImages.length === 1 ? '' : 's'} belong to compacted groups with ${additionalCount} additional related file${additionalCount === 1 ? '' : 's'}. Include those related files too?`,
                okText: `Include related (${expandedUrls.length})`,
                cancelText: `Selected only (${selectedImages.length})`,
                okButtonProps: actionLabel === 'delete' ? { danger: true } : undefined,
                onOk: () => resolve(expandedUrls),
                onCancel: () => resolve(selectedImages),
            });
        });
    };

    const bulkDownloadSelected = async () => {
        setBulkDownloading(true);
        try {
            const urlsToDownload = await resolveSelectedUrlsForCompact('download');
            const itemsToDownload = urlsToDownload
                .map(url => selectedItemByUrl.get(url))
                .filter(Boolean) as FileDetails[];
            const count = await downloadMediaFiles(itemsToDownload, 'comfyui-gallery-selected.zip');
            if (count > 0) {
                message.success(`Downloaded ${count} file${count === 1 ? '' : 's'}.`);
            }
        } catch (error) {
            console.error('Failed to download selected files:', error);
            message.error('Failed to download selected files.');
        } finally {
            setBulkDownloading(false);
        }
    };

    const bulkDeleteSelected = async () => {
        const urlsToDelete = await resolveSelectedUrlsForCompact('delete');
        let deleted = 0;
        const deletedUrls: string[] = [];
        for (const url of urlsToDelete) {
            try {
                const success = await ComfyAppApi.deleteImage(url);
                if (success) {
                    deleted++;
                    deletedUrls.push(url);
                }
            } catch (e) {
                console.error('Failed to delete image:', url, e);
            }
        }
        if (deleted > 0) {
            message.success(`Deleted ${deleted} file${deleted === 1 ? '' : 's'}.`);
            applyDeletedUrls(deletedUrls);
            clearMultiSelect();
        } else {
            message.error('Failed to delete selected files.');
        }
    };

    const bulkMoveSelected = async () => {
        if (!moveTargetFolder) return;
        setBulkMoving(true);
        try {
            const urlsToMove = await resolveSelectedUrlsForCompact('move');
            let moved = 0;
            const movedUrls: string[] = [];
            for (const url of urlsToMove) {
                const sourcePath = getGalleryRelativePath(url);
                const fileName = getFileNameFromPath(sourcePath);
                const targetPath = `${moveTargetFolder}/${fileName}`;
                if (sourcePath === targetPath) {
                    moved++;
                    continue;
                }
                const success = await ComfyAppApi.moveImage(sourcePath, targetPath);
                if (success) {
                    moved++;
                    movedUrls.push(url);
                }
            }
            if (moved > 0) {
                message.success(`Moved ${moved} file${moved === 1 ? '' : 's'}.`);
                applyMovedUrls(movedUrls, moveTargetFolder);
                setMoveModalOpen(false);
                clearMultiSelect();
            } else {
                message.error('Failed to move selected files.');
            }
        } finally {
            setBulkMoving(false);
        }
    };

    return (
        <Flex vertical gap={8} style={{ width: '100%' }}>
            <Flex
                justify={"space-between"}
                align={"center"}
                gap={12}
                wrap="wrap"
            >
                <Flex align="center" gap={8} style={{ minWidth: 210 }}>
                    <PictureOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                    <Typography style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ComfyUI Gallery
                    </Typography>
                    <Tooltip title={showFolderBar ? 'Hide folder navigation' : 'Show folder navigation'} placement="bottom">
                        <Button
                            size="small"
                            type={showFolderBar ? 'primary' : 'default'}
                            icon={showFolderBar ? <FolderOpenOutlined /> : <FolderOutlined />}
                            onClick={() => setShowFolderBar(prev => !prev)}
                            aria-label={showFolderBar ? 'Hide folder navigation' : 'Show folder navigation'}
                        />
                    </Tooltip>
                </Flex>
                <Flex align="center" gap={8} wrap="wrap" style={{ flex: 1, minWidth: 320 }}>
                    <Flex align="center" gap={4}>
                        <Select
                            size="middle"
                            value={searchScope}
                            onChange={setSearchScope}
                            style={{ width: 136 }}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Filename', value: 'filename' },
                                { label: 'Metadata', value: 'metadata' },
                                { label: 'Positive Prompt', value: 'positive' },
                                { label: 'Negative Prompt', value: 'negative' },
                                { label: 'Model', value: 'model' },
                                { label: 'Seed', value: 'seed' },
                            ]}
                        />
                        <AutoComplete
                            options={
                                autoCompleteOptions && autoCompleteOptions.length > 0
                                    ? autoCompleteOptions
                                    : imagesAutoCompleteNames
                            }
                            style={{
                                width: 240,
                                maxWidth: '100%'
                            }}
                            onSearch={text => setSearch(text)}
                            value={search}
                            onChange={val => setSearch(val)}
                            placeholder="Search"
                            allowClear={{
                                clearIcon: <CloseSquareFilled />
                            }}
                        />
                    </Flex>
                    <Flex vertical gap={2}>
                        <Flex gap={4}>
                            <Button
                                size="small"
                                type="default"
                                onClick={toggleDateSort}
                                style={{
                                    ...sortButtonBaseStyle,
                                    ...(sortMethod === 'Newest' || sortMethod === 'Oldest' ? sortButtonActiveStyle : {}),
                                }}
                            >
                                {dateSort} {dateSort === 'Newest' ? '↓' : '↑'}
                            </Button>
                            <Button
                                size="small"
                                type="default"
                                onClick={toggleNameSort}
                                style={{
                                    ...sortButtonBaseStyle,
                                    ...(sortMethod === 'Name ↑' || sortMethod === 'Name ↓' ? sortButtonActiveStyle : {}),
                                }}
                            >
                                {nameSort}
                            </Button>
                        </Flex>
                        <Segmented
                            size="small"
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Images', value: 'images' },
                                { label: 'Videos', value: 'videos' },
                            ]}
                            value={mediaFilter}
                            onChange={value => setMediaFilter(value as any)}
                        />
                    </Flex>
                    <Flex vertical gap={2}>
                        <DatePicker
                            size="small"
                            allowClear
                            placeholder="Start Date"
                            onChange={(_, dateString) => setDateRange([getDateString(dateString) || null, dateRange[1]])}
                            style={{ width: 118 }}
                        />
                        <DatePicker
                            size="small"
                            allowClear
                            placeholder="End Date"
                            onChange={(_, dateString) => setDateRange([dateRange[0], getDateString(dateString) || null])}
                            style={{ width: 118 }}
                        />
                    </Flex>
                    <Flex vertical gap={2}>
                        <Segmented
                            size="small"
                            options={[
                                { label: 'Small', value: 'small' },
                                { label: 'Medium', value: 'medium' },
                                { label: 'Large', value: 'large' },
                            ]}
                            value={previewSize}
                            onChange={value => setPreviewSize(value as any)}
                        />
                        <Segmented
                            size="small"
                            options={[
                                { label: '20', value: 20 },
                                { label: '40', value: 40 },
                                { label: '60', value: 60 },
                            ]}
                            value={mediaBatchSize}
                            onChange={value => setMediaBatchSize(value as 20 | 40 | 60)}
                        />
                    </Flex>
                    <Flex vertical gap={2}>
                        <Flex align="center" gap={6} style={{ padding: '2px 5px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' }}>
                            <Typography style={{ fontSize: 12, fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>
                                Date Sections
                            </Typography>
                            <Segmented
                                size="small"
                                options={[
                                    { label: 'Off', value: false },
                                    { label: 'On', value: true },
                                ]}
                                value={settings.showDateDivider}
                                onChange={value => setSettings({ ...settings, showDateDivider: Boolean(value) })}
                            />
                        </Flex>
                    </Flex>
                    <Flex vertical gap={2}>
                        <Flex align="center" gap={6} style={{ padding: '2px 5px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' }}>
                            <Typography style={{ fontSize: 12, fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>
                                Subfolders
                            </Typography>
                            <Segmented
                                size="small"
                                options={[
                                    { label: 'Off', value: false },
                                    { label: 'On', value: true },
                                ]}
                                value={includeSubfolders}
                                onChange={value => setIncludeSubfolders(Boolean(value))}
                            />
                        </Flex>
                    </Flex>
                    <Flex vertical gap={2}>
                        <Flex align="center" gap={6} style={{ padding: '2px 5px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' }}>
                            <Typography style={{ fontSize: 12, fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>
                                Autoplay
                            </Typography>
                            <Segmented
                                size="small"
                                options={[
                                    { label: 'Off', value: false },
                                    { label: 'On', value: true },
                                ]}
                                value={settings.autoPlayVideos}
                                onChange={value => setSettings({ ...settings, autoPlayVideos: Boolean(value) })}
                            />
                        </Flex>
                        <Tooltip title="Group related outputs with the same filename, including -audio variants, into one browsable card." placement="bottom">
                            <Flex align="center" gap={6} style={{ padding: '2px 5px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' }}>
                                <Typography style={{ fontSize: 12, fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>
                                    Compact
                                </Typography>
                                <Segmented
                                    size="small"
                                    options={[
                                        { label: 'Off', value: false },
                                        { label: 'On', value: true },
                                    ]}
                                    value={compactOutputs}
                                    onChange={value => setCompactOutputs(Boolean(value))}
                                />
                            </Flex>
                        </Tooltip>
                    </Flex>
            {showClose && (
                <div
                    style={{ 
                        display: 'inline-block' 
                    }}
                    onDragEnter={e => {
                        e.preventDefault();
                        dragCounter.current++;
                        if (!targetDate) {
                            setTargetDate(Date.now() + 3000);
                        }
                    }}
                    onDragLeave={e => {
                        e.preventDefault();
                        dragCounter.current--;
                        if (dragCounter.current === 0 && targetDate) {
                            setTargetDate(undefined);
                        }
                    }}
                >
                    <Button
                        type="default"
                        style={{ 
                            marginLeft: "8px",
                            display: "flex",
                            alignItems: "center",
                            position: "relative",
                            cursor: "pointer",
                            justifyContent: "center",
                            alignContent: "center",
                            flexWrap: "wrap",
                            width: 150
                        }}
                        tabIndex={-1} // Prevent focus flicker
                    >
                        {targetDate
                            ? (
                                <Typography 
                                    style={{ 
                                        color: '#ff4d4f', 
                                        fontWeight: 500 
                                    }}
                                >
                                    {`   Close in ${Math.ceil(countdown / 1000)}s   `}
                                </Typography>
                            ) : (
                                <Typography 
                                    style={{ 
                                        color: '#888', 
                                        fontWeight: 400 
                                    }}
                                >
                                    Hover to close 3s
                                </Typography>
                            )
                        }
                    </Button>
                </div>
            )}
                </Flex>
                <Flex align="center" gap={8} style={{ marginLeft: 'auto' }}>
                    <Button
                        size={"middle"}
                        icon={<SettingOutlined />}
                        onClick={() => setShowSettings(true)}
                    >
                        Settings
                    </Button>
                    <Button
                        danger
                        type="primary"
                        size="middle"
                        icon={<CloseOutlined />}
                        onClick={() => setOpen(false)}
                        aria-label="Close gallery"
                    >
                        Close
                    </Button>
                </Flex>
            </Flex>
            {(multiSelectMode || selectedImages.length > 0) && (
                <Flex
                    align="center"
                    gap={8}
                    wrap="wrap"
                    className="selectedImagesActionButton"
                    style={{
                        minHeight: 36,
                        padding: '4px 8px',
                        borderTop: '1px solid #f0f0f0',
                        borderBottom: '1px solid #f0f0f0',
                        background: '#fafafa',
                    }}
                >
                    <Typography style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>
                        {selectedImages.length} selected
                    </Typography>
                    <Popconfirm
                        title="Delete selected files"
                        description={`Delete ${selectedImages.length} selected file${selectedImages.length === 1 ? '' : 's'}? This cannot be undone.`}
                        onConfirm={bulkDeleteSelected}
                        okText={`Delete (${selectedImages.length})`}
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, disabled: selectedImages.length === 0 }}
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            disabled={selectedImages.length === 0}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                    <Button
                        icon={<FolderOpenOutlined />}
                        disabled={selectedImages.length === 0}
                        onClick={() => {
                            setMoveTargetFolder(currentFolder);
                            setMoveModalOpen(true);
                        }}
                    >
                        Move
                    </Button>
                    <Button
                        icon={<DownloadOutlined />}
                        loading={bulkDownloading}
                        disabled={selectedImages.length === 0}
                        onClick={bulkDownloadSelected}
                    >
                        Download
                    </Button>
                    <Button onClick={selectAllVisible} disabled={selectableImages.length === 0}>
                        Select All
                    </Button>
                    <Button onClick={clearMultiSelect}>
                        Clear
                    </Button>
                </Flex>
            )}
            {showFolderBar && <GalleryFolderBar />}
            <Modal
                open={moveModalOpen}
                className="selectedImagesActionButton"
                title={`Move ${selectedImages.length} selected file${selectedImages.length === 1 ? '' : 's'}`}
                okText="Move"
                okButtonProps={{ disabled: !moveTargetFolder || selectedImages.length === 0, loading: bulkMoving }}
                onOk={bulkMoveSelected}
                onCancel={() => setMoveModalOpen(false)}
            >
                <Tree
                    blockNode
                    defaultExpandAll
                    selectedKeys={moveTargetFolder ? [moveTargetFolder] : []}
                    treeData={folderTreeData}
                    onSelect={keys => setMoveTargetFolder(String(keys[0] ?? ''))}
                    style={{ maxHeight: 360, overflow: 'auto' }}
                />
            </Modal>
        </Flex>
    );
};

export default GalleryHeader;
