import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Empty, Image, Spin } from 'antd';
import { AutoSizer } from 'react-virtualized';
import { VariableSizeGrid } from 'react-window';
import ImageCard, { ImageCardHeight, ImageCardWidth } from './ImageCard';
import { useGalleryContext } from './GalleryContext';
import { MetadataView } from './MetadataView';
import { ModelViewer } from './ModelViewer';
import type { FileDetails } from './types';
import { BASE_PATH } from "./ComfyAppApi";
import { getFolderMediaList } from './galleryFolderUtils';
import type { GalleryPreviewSize } from './GalleryContext';

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

        return {
            ...representative,
            compactCount: group.length,
        };
    });
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

const GalleryImageGrid = () => {
    const {
        data,
        currentFolder,
        searchFileName,
        sortMethod,
        mediaFilter,
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
        previewSize,
        mediaBatchSize,
        compactOutputs
    } = useGalleryContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<any>(null);
    const [visibleMediaLimit, setVisibleMediaLimit] = useState<number>(mediaBatchSize);
    const [pendingScrollDate, setPendingScrollDate] = useState<string | null>(null);
    const previewLayout = useMemo(
        () => getPreviewLayout(gridSize.width, previewSize),
        [gridSize.width, previewSize]
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
    }, [currentFolder, data, mediaFilter, sortMethod, searchFileName, compactOutputs, gridSize.columnCount, settings.showDateDivider]);
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
        return imagesDetailsList.reduce<Array<{ date: string; rowIndex: number; mediaBefore: number }>>((rows, item, index) => {
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

    const imagesUrlsLists = useMemo(() =>
        visibleImagesDetailsList.filter(isMediaItem).map(image => `${BASE_PATH}${image.url}`),
        [visibleImagesDetailsList]
    );

    useEffect(() => {
        setVisibleMediaLimit(mediaBatchSize);
        setPendingScrollDate(null);
    }, [currentFolder, searchFileName, sortMethod, mediaFilter, compactOutputs, mediaBatchSize]);

    useEffect(() => {
        if (pendingScrollDate === null) return;
        const targetRow = visibleDateDividerRows.find(row => row.date === pendingScrollDate);
        if (!targetRow) return;
        gridRef.current?.scrollToItem?.({
            rowIndex: targetRow.rowIndex,
            columnIndex: 0,
            align: 'start',
        });
        setPendingScrollDate(null);
    }, [pendingScrollDate, visibleDateDividerRows]);

    const scrollToDateRow = useCallback((target: { date: string; mediaBefore: number }) => {
        const requiredVisibleLimit = Math.max(mediaBatchSize, target.mediaBefore + 1);
        setVisibleMediaLimit(currentLimit => Math.max(currentLimit, requiredVisibleLimit));
        setPendingScrollDate(target.date);
    }, [mediaBatchSize]);

    const handleInfoClick = useCallback((imageName: string) => {
        // Set the info modal target

        // If the item is media/audio/3d, set previewing state so the preview group uses media renderer
        const item = visibleImagesDetailsList.find(image => image.name === imageName);
        if (item && (item.type === 'media' || item.type === 'audio' || item.type === '3d')) {
            setPreviewingVideo(item.name);
        } else {
            setPreviewingVideo(undefined);
        }

        setImageInfoName(imageName);
    }, [setImageInfoName, visibleImagesDetailsList, setPreviewingVideo]);

    const Cell = useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
        const index = rowIndex * previewLayout.columnCount + columnIndex;
        const image = visibleImagesDetailsList[index];
        if (!image) return null;
        if (image.type === 'divider') {
            if (columnIndex !== 0) return null;
            const currentDateIndex = dateDividerRows.findIndex(row => row.date === image.name);
            const previousDate = currentDateIndex > 0 ? dateDividerRows[currentDateIndex - 1] : undefined;
            const nextDate = currentDateIndex >= 0 && currentDateIndex < dateDividerRows.length - 1 ? dateDividerRows[currentDateIndex + 1] : undefined;
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
                        width: gridSize.width,
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
                                style={jumpButtonStyle}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    scrollToDateRow(nextDate);
                                }}
                            >
                                ↓ Next Day
                            </Button>
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
                    onInfoClick={() => handleInfoClick(image.name)} onVideoClick={() => setPreviewingVideo(image.name)}
                />
            </div>
        );
    }, [gridSize.width, visibleImagesDetailsList, handleInfoClick, setPreviewingVideo, currentFolder, previewLayout.columnCount, previewLayout.cardWidth, previewLayout.cardHeight, dateDividerRows, scrollToDateRow]);

    useEffect(() => {
        const { width, height } = autoSizer;
        const { columnCount } = getPreviewLayout(width, previewSize);
        const rowCount = Math.ceil(visibleImagesDetailsList.length / columnCount);
        setGridSize({ width, height, columnCount, rowCount });
    }, [autoSizer.width, autoSizer.height, visibleImagesDetailsList.length, previewSize]);

    useEffect(() => {
        const grid = document.querySelector(".grid-element");
        if (grid) {
            Array.from(grid.children).forEach(child => {
                (child as HTMLElement).style.position = 'relative';
            });
        }
    }, [gridSize, imageInfoName, currentFolder, data]);

    // Memoized previewable images for InfoView navigation and rendering
    const previewableImages = useMemo(() =>
        visibleImagesDetailsList.filter(isMediaItem),
        [visibleImagesDetailsList]
    );

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
        if (imageInfoName != undefined) {
            let image = previewableImages[info.current];
            if (!image) return originalNode;
            return (
                <MetadataView
                    image={image}
                    onShowRaw={() => setShowRawMetadata(true)}
                    showRawMetadata={showRawMetadata}
                    setShowRawMetadata={setShowRawMetadata}
                />
            );
        } else {
            let image = previewableImages[info.current];
            if (!image) return originalNode;
            if (image.type === 'audio') {
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <h2 style={{ color: 'white', marginBottom: '24px', maxWidth: '80%', textAlign: 'center', wordWrap: 'break-word' }}>
                            {image.name}
                        </h2>
                        <audio
                            key={image.name}
                            style={{ maxWidth: "-webkit-fill-available", width: "80%" }}
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
                return (
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
                return (
                    <video
                        key={image.name}
                        style={{ maxWidth: "-webkit-fill-available", width: "80%" }}
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
                );
            }
            return originalNode;
        }
    }, [imageInfoName, previewableImages, showRawMetadata, setShowRawMetadata, settings.autoPlayVideos, stopPropagation]);

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
                        if (!open) setPreviewingVideo(undefined);
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
                            }
                            const layout = getPreviewLayout(width, previewSize);
                            return (
                                <VariableSizeGrid
                                    ref={gridRef}
                                    key={`${previewSize}-${layout.columnCount}-${visibleImagesDetailsList.length}`}
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
