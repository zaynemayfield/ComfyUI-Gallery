import React, { useMemo, useCallback, memo, useRef } from 'react';
import { Tree, Spin } from 'antd';
import { useGalleryContext } from './GalleryContext';
import type { FilesTree } from './types';
import { useDrop } from 'ahooks';
import FolderOutlined from '@ant-design/icons/lib/icons/FolderOutlined';
import { ComfyAppApi } from './ComfyAppApi';
import { getFolderMediaList } from './galleryFolderUtils';

interface TreeDataNode {
    title: string;
    key: string;
    icon?: React.ReactNode;
    children?: TreeDataNode[];
    isLeaf?: boolean;
}

const foldersToTreeData = (data: FilesTree): TreeDataNode[] => {
    const foldersInput = data.folders;
    const tree: TreeDataNode[] = [];
    const nodeMap = new Map<string, TreeDataNode>();
    const paths = Object.keys(foldersInput);
    if (paths.length > 1) paths.sort();
    for (const fullPath of paths) {
        const segments = fullPath.split('/');
        let currentPath = "";
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (i > 0) currentPath += "/";
            currentPath += segment;
            if (!nodeMap.has(currentPath)) {
                const newNode: TreeDataNode = {
                    title: segment,
                    key: currentPath,
                    icon: <FolderOutlined />,
                    children: [],
                };
                nodeMap.set(currentPath, newNode);
                if (i === 0) {
                    tree.push(newNode);
                } else {
                    const parentPath = segments.slice(0, i).join('/');
                    const parentNode = nodeMap.get(parentPath);
                    if (parentNode) {
                        parentNode.children!.push(newNode);
                    }
                }
            }
        }
    }
    for (const node of nodeMap.values()) {
        if (!node.children || node.children.length === 0) {
            node.isLeaf = true;
        }
    }
    return tree;
};

const FolderTitle = memo(({ nodeData }: { nodeData: any }) => {
    const folderRef = useRef<HTMLDivElement>(null);
    const { data, selectedImages, setSelectedImages } = useGalleryContext();

    const folderImages = React.useMemo(() => {
        if (!data?.folders) return [];
        return getFolderMediaList(data, nodeData.key)
            .filter((img: any) => img && img.url)
            .map((img: any) => img.url);
    }, [data, nodeData.key]);

    const allSelected = folderImages.length > 0 && folderImages.every(url => selectedImages.includes(url));

    const handleCardClick = (event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            event.stopPropagation();
            event.preventDefault();
            setSelectedImages((oldSelectedImages) => {
                if (allSelected) {
                    return oldSelectedImages.filter(url => !folderImages.includes(url));
                } else {
                    return Array.from(new Set([...oldSelectedImages, ...folderImages]));
                }
            });
        } else {
            setSelectedImages([]);
        }
    };

    useDrop(folderRef, {
        onDom: (content: any) => {
            try {
                const dragData = typeof content === 'string' ? JSON.parse(content) : content;
                if (dragData && dragData.name && dragData.folder) {
                    if (dragData.folder === nodeData.key) return;
                    const sourcePath = `${dragData.folder}/${dragData.name}`;
                    const targetPath = `${nodeData.key}/${dragData.name}`;
                    ComfyAppApi.moveImage(sourcePath, targetPath);
                }
            } catch (err) {
                console.error('Error parsing drag data:', err, content);
            }
        },
    });
    return (
        <span
            ref={folderRef}
            className={`folder ${allSelected ? 'folder-selected' : ''}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                borderRadius: 4,
                transition: 'background 0.2s',
                cursor: 'pointer',
                background: allSelected ? 'rgba(24, 144, 255, 0.15)' : undefined,
                border: allSelected ? '1.5px solid #1890ff' : undefined,
            }}
            onClick={handleCardClick}
        >
            <span style={{ marginLeft: 0 }}>{nodeData.title}</span>
            <style>{`
                .folder-selected {
                    background: rgba(24, 144, 255, 0.15) !important;
                    border: 1.5px solid #1890ff !important;
                }
            `}</style>
        </span>
    );
});

const GallerySidebar = () => {
    const { data, loading, setCurrentFolder, siderCollapsed, settings } = useGalleryContext();
    const treeData = useMemo(() => {
        if (loading || !data) return [];
        return foldersToTreeData(data);
    }, [loading, data && JSON.stringify(data.folders)]);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const renderTreeTitle = useCallback((nodeData: any) => (
        <FolderTitle nodeData={nodeData} />
    ), []);

    const handleTreeSelect = useCallback((keys: React.Key[]) => {
        if (keys.length > 0) setCurrentFolder(keys[0] as string);
        
    }, [setCurrentFolder]);

    if (siderCollapsed) return (<></>);

    return (
        <div className="gallery-sidebar" style={{ position: 'relative', height: '100%' }}>
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
            <style>{`
                .gallery-sidebar-tree-box > * {
                    height: auto;
                    min-height: -webkit-fill-available;
                }
            `}</style>
            <div
                className="gallery-sidebar-tree-box"
                style={{
                    position: 'relative',
                    height: '100%'
                }}
                ref={sidebarRef}
            >
                <Tree.DirectoryTree
                    // @ts-ignore
                    defaultExpandAll={settings.expandAllFolders}
                    showLine
                    showIcon
                    onSelect={handleTreeSelect}
                    treeData={treeData}
                    titleRender={renderTreeTitle}
                    expandAction={false} // Prevent collapse/expand on click
                />
            </div>
        </div>
    );
};

export default GallerySidebar;
