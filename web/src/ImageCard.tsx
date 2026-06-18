import { Button, Image, Typography } from 'antd';
import type { FileDetails } from './types';
import InfoCircleOutlined from '@ant-design/icons/lib/icons/InfoCircleOutlined';
import LeftOutlined from '@ant-design/icons/lib/icons/LeftOutlined';
import PictureOutlined from '@ant-design/icons/lib/icons/PictureOutlined';
import RightOutlined from '@ant-design/icons/lib/icons/RightOutlined';
import SoundOutlined from '@ant-design/icons/lib/icons/SoundOutlined';
import VideoCameraOutlined from '@ant-design/icons/lib/icons/VideoCameraOutlined';
import React, { useEffect, useRef, useState } from 'react';
import { useDrag } from 'ahooks';
import { useGalleryContext } from './GalleryContext';
import { BASE_PATH } from './ComfyAppApi';
import { use3DThumbnail } from './GlobalModelRenderer';

const ImageCard3DThumbnail = ({
    image,
    onClick,
    cardWidth,
}: {
    image: FileDetails;
    onClick: () => void;
    cardWidth: number;
}) => {
    const typeMatch = image.url.match(/\.([^.]+)$/);
    const type = typeMatch ? typeMatch[1].toLowerCase() : '';
    const thumbnail = use3DThumbnail(`${BASE_PATH}${image.url}`, type);

    if (thumbnail) {
        return (
            <>
                <img
                    style={{
                        objectFit: "cover",
                        maxWidth: cardWidth,
                        width: '100%',
                        height: '100%',
                        userSelect: 'none',
                        cursor: 'pointer',
                    }}
                    src={thumbnail}
                    onClick={onClick}
                    alt={image.name}
                    draggable={false}
                />
                <Image
                    id={image.url}
                    style={{ display: 'none' }}
                    src={`${BASE_PATH}${image.url}`}
                    onClick={onClick}
                />
            </>
        );
    }

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#23272f', cursor: 'pointer' }}
            onClick={onClick}
        >
            <div style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px', fontWeight: 'bold' }}>3D</div>
            <Typography.Text style={{ padding: '0 16px', textAlign: 'center', maxWidth: '100%' }} ellipsis>
                {image.name}
            </Typography.Text>
            <Image
                id={image.url}
                style={{ display: 'none' }}
                src={`${BASE_PATH}${image.url}`}
                onClick={onClick}
            />
        </div>
    );
};

export const ImageCardWidth = 350;
export const ImageCardHeight = 450;
export type ImageCardDimensions = {
    width: number;
    height: number;
};

function ImageCard({
    image,
    index,
    onInfoClick,
    onVideoClick,
    cardWidth = ImageCardWidth,
    cardHeight = ImageCardHeight,
}: {
    image: FileDetails & { dragFolder?: string; compactCount?: number; compactItems?: FileDetails[] };
    index: number;
    onInfoClick: (image: FileDetails) => void;
    onVideoClick: (image: FileDetails | undefined) => void;
    cardWidth?: number;
    cardHeight?: number;
}) {
    const { settings, selectedImages, setSelectedImages, setPreviewingVideo } = useGalleryContext();
    const dragRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [dragging, setDragging] = useState(false);
    const [videoInView, setVideoInView] = useState(false);
    const compactItems = image.compactItems?.length ? image.compactItems : [image];
    const [compactIndex, setCompactIndex] = useState(0);
    const currentImage = compactItems[Math.min(compactIndex, compactItems.length - 1)] ?? image;
    const mediaBorderColor = currentImage.type === 'media'
        ? 'rgba(250, 173, 20, 0.65)'
        : currentImage.type === 'image'
            ? 'rgba(105, 177, 255, 0.55)'
            : 'rgba(127, 127, 127, 0.38)';

    useEffect(() => {
        setCompactIndex(0);
    }, [image.url, image.compactCount]);

    useDrag(
        {
            name: currentImage.name,
            folder: image.dragFolder || '',
            type: currentImage.type,
            url: currentImage.url,
        },
        dragRef,
        {
            onDragStart: () => setDragging(true),
            onDragEnd: () => setDragging(false),
        }
    );

    useEffect(() => {
        if (currentImage.type !== 'media' || !dragRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => setVideoInView(entry.isIntersecting),
            { threshold: 0.35 }
        );
        observer.observe(dragRef.current);

        return () => observer.disconnect();
    }, [currentImage.type]);

    useEffect(() => {
        if (currentImage.type !== 'media' || !videoRef.current) return;

        const video = videoRef.current;
        if (settings.autoPlayVideos && videoInView) {
            video.play().catch(() => undefined);
        } else {
            video.pause();
        }
    }, [currentImage.type, settings.autoPlayVideos, videoInView, currentImage.url]);

    // Use ctrlKey from click event, not global state
    const handleCardClick = (event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            // The click dont stop
            event.stopPropagation();
            event.preventDefault();

            setSelectedImages((oldSelectedImages) => {
                if (oldSelectedImages.includes(currentImage.url)) {
                    return [...oldSelectedImages.filter((selectedImage) => selectedImage != currentImage.url)];
                } else {
                    return [...oldSelectedImages, currentImage.url];
                }
            });
        } else {
            setSelectedImages([]);
        }
    };

    // Native drag for exporting image as file/image
    const handleNativeDragStart = (event: React.DragEvent<HTMLImageElement | HTMLVideoElement | HTMLAudioElement>) => {
        // Guess MIME based on filename extension (frontend-only, no backend changes)
        const guessMimeFromName = (name?: string) => {
            const ext = (name || '').split('.').pop()?.toLowerCase() || '';
            const map: Record<string, string> = {
                // images
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
                // video
                mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
                // audio
                mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', flac: 'audio/flac', aac: 'audio/aac', ogg: 'audio/ogg',
            };
            return map[ext] || '';
        };

        const guessed = guessMimeFromName(currentImage.name || currentImage.url);
        // Fallback to previous simple heuristic if we couldn't guess from extension
        const mimeType = guessed || (currentImage.type === 'image' ? 'image/png' : currentImage.type === 'audio' ? 'audio/wav' : 'video/mp4');

        event.dataTransfer.setData('text/uri-list', `${BASE_PATH}${currentImage.url}`);
        event.dataTransfer.setData('DownloadURL', `${mimeType}:${currentImage.name}:${window.location.origin + BASE_PATH + currentImage.url}`);
        // Optionally, set a drag image
        // event.dataTransfer.setDragImage(event.currentTarget, 10, 10);
    };

    return (<>
        <div
            className='image-card'
            ref={dragRef}
            style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: 8,
                overflow: "hidden",
                margin: 0,
                border: dragging ? '2px solid #1890ff' : `1px solid ${mediaBorderColor}`,
                boxSizing: 'border-box',
                opacity: dragging ? 0.5 : 1,
                display: "flex",
                alignContent: "center",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                cursor: 'grab',
                boxShadow: selectedImages.includes(currentImage.url) ? '0 0 0 3px #1890ff' : undefined,
            }}
            onClick={handleCardClick}
        >
            <div
                title={currentImage.type === 'media' ? 'Video' : currentImage.type === 'image' ? 'Image' : currentImage.type}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.34)',
                    color: '#fff',
                    pointerEvents: 'none',
                }}
            >
                {currentImage.type === 'media'
                    ? <VideoCameraOutlined />
                    : currentImage.type === 'image'
                        ? <PictureOutlined />
                        : <SoundOutlined />}
            </div>
            {image.compactCount && image.compactCount > 1 && (
                <div
                    title={`${image.compactCount} related outputs compacted`}
                    style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 3,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        height: 22,
                        padding: '0 7px',
                        borderRadius: 4,
                        background: 'rgba(0, 0, 0, 0.58)',
                        border: '1px solid rgba(255, 255, 255, 0.34)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: '20px',
                        pointerEvents: 'none',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            position: 'relative',
                            width: 10,
                            height: 10,
                            display: 'inline-block',
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 2,
                                width: 7,
                                height: 7,
                                border: '1px solid currentColor',
                                borderRadius: 1,
                            }}
                        />
                        <span
                            style={{
                                position: 'absolute',
                                left: 3,
                                top: 0,
                                width: 7,
                                height: 7,
                                border: '1px solid currentColor',
                                borderRadius: 1,
                                background: 'rgba(0, 0, 0, 0.32)',
                            }}
                        />
                    </span>
                    {image.compactCount}
                </div>
            )}
            {compactItems.length > 1 && (
                <>
                    <Button
                        size="small"
                        shape="circle"
                        icon={<LeftOutlined />}
                        onClick={(event) => {
                            event.stopPropagation();
                            setCompactIndex(current => (current - 1 + compactItems.length) % compactItems.length);
                        }}
                        style={{
                            position: 'absolute',
                            left: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 4,
                            background: 'rgba(0, 0, 0, 0.5)',
                            color: '#fff',
                            borderColor: 'rgba(255, 255, 255, 0.36)',
                        }}
                        aria-label="Previous compacted media"
                    />
                    <Button
                        size="small"
                        shape="circle"
                        icon={<RightOutlined />}
                        onClick={(event) => {
                            event.stopPropagation();
                            setCompactIndex(current => (current + 1) % compactItems.length);
                        }}
                        style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 4,
                            background: 'rgba(0, 0, 0, 0.5)',
                            color: '#fff',
                            borderColor: 'rgba(255, 255, 255, 0.36)',
                        }}
                        aria-label="Next compacted media"
                    />
                </>
            )}
            {currentImage.type == "image" ? (<>
                <Image
                    id={currentImage.url}
                    style={{
                        objectFit: "cover",
                        ...(settings.imageThumbFit === 'height'
                            ? { maxHeight: cardHeight, width: 'auto', maxWidth: '100%' }
                            : { maxWidth: cardWidth, width: '100%', height: 'auto' }),
                        userSelect: 'none',
                        cursor: 'grab',
                    }}
                    src={`${BASE_PATH}${currentImage.url}`}
                    loading="lazy"
                    // preview={false}
                    onClick={() => {
                        // Ensure any leftover media preview state is cleared so this opens as an image
                        try { setPreviewingVideo(undefined); } catch { }
                        // Trigger the preview
                        document.getElementById(currentImage.url)?.click();
                    }}
                    alt={currentImage.name}
                    draggable
                    onDragStart={handleNativeDragStart}
                />
            </>) : currentImage.type === "audio" ? (<>
                <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', cursor: 'pointer' }}
                    onClick={() => {
                        try { setPreviewingVideo(undefined); } catch { }
                        document.getElementById(currentImage.url)?.click();
                    }}
                >
                    <SoundOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px' }} />
                    <Typography.Text style={{ marginBottom: '16px', padding: '0 16px', textAlign: 'center', maxWidth: '100%' }} ellipsis>
                        {currentImage.name}
                    </Typography.Text>
                    <audio controls style={{ width: '90%', height: '40px' }} src={`${BASE_PATH}${currentImage.url}`} onClick={(e) => e.stopPropagation()} />
                    <Image
                        id={currentImage.url}
                        style={{ display: 'none' }}
                        src={`${BASE_PATH}${currentImage.url}`}
                        loading="lazy"
                        alt={currentImage.name}
                    />
                </div>
            </>) : currentImage.type === "3d" ? (
                <ImageCard3DThumbnail image={currentImage as any} cardWidth={cardWidth} onClick={() => {
                    try { setPreviewingVideo(undefined); } catch { }
                    document.getElementById(currentImage.url)?.click();
                }} />
            ) : <>
                <video
                    key={currentImage.url}
                    ref={videoRef}
                    style={{
                        ...(settings.videoThumbFit === 'height'
                            ? { maxHeight: cardHeight }
                            : { maxWidth: cardWidth }),
                        cursor: "pointer"
                    }}
                    src={`${BASE_PATH}${currentImage.url}`}
                    autoPlay={false}
                    loop={settings.autoPlayVideos}
                    muted={true}
                    preload="metadata"
                    onClick={() => {
                        onVideoClick(currentImage);
                        document.getElementById(currentImage.url)?.click();
                    }}
                    draggable
                    onDragStart={handleNativeDragStart}
                />
                <Image
                    id={currentImage.url}
                    style={{
                        display: "none"
                    }}
                    src={`${BASE_PATH}${currentImage.url}`}
                    loading="lazy"
                    // preview={false}
                    alt={currentImage.name}
                />
            </>}
            <div
                style={{
                    position: "absolute",
                    backgroundColor: "#00000042",
                    width: "-webkit-fill-available",
                    padding: "10px",
                    bottom: "0px",
                    display: "flex",
                    alignContent: "center",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Typography.Text
                    strong
                    style={{
                        margin: 0,
                        color: "white"
                    }}
                    ellipsis={{

                    }}
                >
                    {currentImage.name}
                </Typography.Text>
                <Button
                    color="cyan"
                    variant="filled"
                    icon={<InfoCircleOutlined />}
                    size={"middle"}
                    onClick={() => {
                        onInfoClick(currentImage);
                        document.getElementById(currentImage.url)?.click();
                    }}
                />
            </div>
        </div>
    </>)
}

export default ImageCard
