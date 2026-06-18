import { useEffect, useRef, useState } from 'react';
import { Flex, AutoComplete, Button, DatePicker, Modal, Segmented, message, Popconfirm, Tooltip, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { CloseOutlined, CloseSquareFilled, DeleteOutlined, FolderOpenOutlined, FolderOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import { useGalleryContext } from './GalleryContext';
import { useDebounce, useCountDown } from 'ahooks';
import Typography from 'antd/es/typography/Typography';
import { ComfyAppApi } from './ComfyAppApi';
import GalleryFolderBar from './GalleryFolderBar';

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

const GalleryHeader = () => {
    const {
        setShowSettings,
        setSearchFileName,
        sortMethod, setSortMethod,
        mediaFilter, setMediaFilter,
        setDateRange,
        previewSize, setPreviewSize,
        mediaBatchSize, setMediaBatchSize,
        compactOutputs, setCompactOutputs,
        imagesAutoCompleteNames,
        autoCompleteOptions, setAutoCompleteOptions,
        setOpen,
        selectedImages, setSelectedImages,
        multiSelectMode, setMultiSelectMode,
        settings, setSettings,
        data,
        currentFolder,
        imagesDetailsList,
        runAsync,
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

    const clearMultiSelect = () => {
        setSelectedImages([]);
        setMultiSelectMode(false);
    };

    const selectAllVisible = () => {
        setSelectedImages(Array.from(new Set(selectableImages.map(image => image.url))));
        setMultiSelectMode(selectableImages.length > 0);
    };

    const bulkDeleteSelected = async () => {
        let deleted = 0;
        for (const url of selectedImages) {
            try {
                const success = await ComfyAppApi.deleteImage(url);
                if (success) deleted++;
            } catch (e) {
                console.error('Failed to delete image:', url, e);
            }
        }
        if (deleted > 0) {
            message.success(`Deleted ${deleted} file${deleted === 1 ? '' : 's'}.`);
            clearMultiSelect();
            runAsync();
        } else {
            message.error('Failed to delete selected files.');
        }
    };

    const bulkMoveSelected = async () => {
        if (!moveTargetFolder) return;
        setBulkMoving(true);
        try {
            let moved = 0;
            for (const url of selectedImages) {
                const sourcePath = getGalleryRelativePath(url);
                const fileName = getFileNameFromPath(sourcePath);
                const targetPath = `${moveTargetFolder}/${fileName}`;
                if (sourcePath === targetPath) {
                    moved++;
                    continue;
                }
                const success = await ComfyAppApi.moveImage(sourcePath, targetPath);
                if (success) moved++;
            }
            if (moved > 0) {
                message.success(`Moved ${moved} file${moved === 1 ? '' : 's'}.`);
                setMoveModalOpen(false);
                clearMultiSelect();
                runAsync();
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
                    <AutoComplete
                        options={
                            autoCompleteOptions && autoCompleteOptions.length > 0
                                ? autoCompleteOptions
                                : imagesAutoCompleteNames
                        }
                        style={{
                            width: 280,
                            maxWidth: '100%'
                        }}
                        onSearch={text => setSearch(text)}
                        value={search}
                        onChange={val => setSearch(val)}
                        placeholder="Search files"
                        allowClear={{
                            clearIcon: <CloseSquareFilled />
                        }}
                    />
                    <Button
                        size="middle"
                        type={sortMethod === 'Newest' || sortMethod === 'Oldest' ? 'primary' : 'default'}
                        onClick={toggleDateSort}
                        style={{ minWidth: 78 }}
                    >
                        {dateSort}
                    </Button>
                    <Button
                        size="middle"
                        type={sortMethod === 'Name ↑' || sortMethod === 'Name ↓' ? 'primary' : 'default'}
                        onClick={toggleNameSort}
                        style={{ minWidth: 82 }}
                    >
                        {nameSort}
                    </Button>
                    <Segmented
                        options={[
                            { label: 'All', value: 'all' },
                            { label: 'Images', value: 'images' },
                            { label: 'Videos', value: 'videos' },
                        ]}
                        value={mediaFilter}
                        onChange={value => setMediaFilter(value as any)}
                    />
                    <DatePicker.RangePicker
                        size="middle"
                        allowClear
                        placeholder={['Start date', 'End date']}
                        onChange={(_, dateStrings) => {
                            setDateRange([
                                dateStrings[0] || null,
                                dateStrings[1] || null,
                            ]);
                        }}
                        style={{ width: 230 }}
                    />
                    <Segmented
                        options={[
                            { label: 'Small', value: 'small' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'Large', value: 'large' },
                        ]}
                        value={previewSize}
                        onChange={value => setPreviewSize(value as any)}
                    />
                    <Segmented
                        options={[
                            { label: '20', value: 20 },
                            { label: '40', value: 40 },
                            { label: '60', value: 60 },
                        ]}
                        value={mediaBatchSize}
                        onChange={value => setMediaBatchSize(value as 20 | 40 | 60)}
                    />
                    <Tooltip title="Group related outputs with the same filename, including -audio variants, into one browsable card." placement="bottom">
                        <Button
                            size="middle"
                            type={compactOutputs ? 'primary' : 'default'}
                            onClick={() => setCompactOutputs(prev => !prev)}
                        >
                            Compact
                        </Button>
                    </Tooltip>
                    <Segmented
                        options={[
                            { label: 'Autoplay Off', value: false },
                            { label: 'Autoplay On', value: true },
                        ]}
                        value={settings.autoPlayVideos}
                        onChange={value => setSettings({ ...settings, autoPlayVideos: Boolean(value) })}
                    />
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
