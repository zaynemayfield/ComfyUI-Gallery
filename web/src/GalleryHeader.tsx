import { useEffect, useRef, useState } from 'react';
import { Flex, AutoComplete, Button, Segmented, message, Popconfirm, Tooltip } from 'antd';
import { CloseSquareFilled, FolderOpenOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import { useGalleryContext } from './GalleryContext';
import { useDebounce, useCountDown } from 'ahooks';
import Typography from 'antd/es/typography/Typography';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { BASE_PATH, ComfyAppApi } from './ComfyAppApi';
import GalleryFolderBar from './GalleryFolderBar';

const GalleryHeader = () => {
    const {
        setShowSettings,
        setSearchFileName,
        sortMethod, setSortMethod,
        imagesAutoCompleteNames,
        autoCompleteOptions, setAutoCompleteOptions,
        setOpen,
        selectedImages, setSelectedImages,
        siderCollapsed, setSiderCollapsed
    } = useGalleryContext();

    const [search, setSearch] = useState("");
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

    const [downloading, setDownloading] = useState(false);
    const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                    <Tooltip title={siderCollapsed ? 'Show folder tree' : 'Hide folder tree'} placement="bottom">
                        <Button
                            size="small"
                            icon={<FolderOpenOutlined />}
                            onClick={() => setSiderCollapsed((prev: boolean) => !prev)}
                            aria-label={siderCollapsed ? 'Show folder tree' : 'Hide folder tree'}
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
                    <Segmented<string>
                        options={['Newest', 'Oldest', 'Name ↑', 'Name ↓']}
                        value={sortMethod}
                        onChange={value => setSortMethod(value as any)}
                    />
            {selectedImages && selectedImages.length > 0 && (
                <>
                    <Popconfirm
                        title="Download Selected Images"
                        description={`Are you sure you want to download ${selectedImages.length} selected image(s)?`}
                        onConfirm={async () => {
                            setDownloading(true);
                            try {
                                const zip = new JSZip();
                                await Promise.all(selectedImages.map(async (url) => {
                                    try {
                                        const fetchUrl = url.startsWith('http') ? url : `${BASE_PATH}${url}`;
                                        const response = await fetch(fetchUrl);
                                        const blob = await response.blob();
                                        const filename = url.split('/').pop() || 'image';
                                        zip.file(filename, blob);
                                    } catch (e) {
                                        console.error('Failed to fetch image:', url, e);
                                    }
                                }));
                                const content = await zip.generateAsync({ type: 'blob' });
                                FileSaver.saveAs(content, 'comfy-ui-gallery-images.zip');
                            } catch (error) {
                                message.error('Failed to download images.');
                            } finally {
                                setDownloading(false);
                            }
                        }}
                        onCancel={() => message.info('Download cancelled')}
                        okText={`Download (${selectedImages.length})`}
                        cancelText="Cancel"
                        okButtonProps={{ loading: downloading }}
                    >
                        <Button
                            type="primary"
                            loading={downloading}
                            style={{ marginLeft: 8 }}
                            className="selectedImagesActionButton"
                        >
                            Download Selected
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title="Delete Selected Images"
                        description={`Are you sure you want to delete ${selectedImages.length} selected image(s)? This cannot be undone.`}
                        onConfirm={async () => {
                            let deleted = 0;
                            for (const url of selectedImages) {
                                try {
                                    const success = await ComfyAppApi.deleteImage(url);
                                    if (success) deleted++;
                                    await new Promise(res => setTimeout(res, 50));
                                } catch (e) {
                                    console.error('Failed to delete image:', url, e);
                                }
                            }
                            if (deleted > 0) {
                                message.success(`Deleted ${deleted} image(s).`);
                                setSelectedImages([]);
                            } else {
                                message.error(`Failed to delete images.`);
                            }
                        }}
                        onCancel={() => message.info('Delete cancelled')}
                        okText={`Delete (${selectedImages.length})`}
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            danger
                            style={{ marginLeft: 8 }}
                            className="selectedImagesActionButton"
                        >
                            Delete Selected
                        </Button>
                    </Popconfirm>
                </>
            )}
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
                <Button
                    size={"middle"}
                    icon={<SettingOutlined />}
                    onClick={() => setShowSettings(true)}
                    style={{ marginLeft: 'auto' }}
                >
                    Settings
                </Button>
            </Flex>
            <GalleryFolderBar />
        </Flex>
    );
};

export default GalleryHeader;
