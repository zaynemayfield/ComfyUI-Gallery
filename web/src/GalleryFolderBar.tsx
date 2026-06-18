import { Button, Flex, Typography } from 'antd';
import FolderOutlined from '@ant-design/icons/lib/icons/FolderOutlined';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGalleryContext } from './GalleryContext';
import { getChildFolders, getFolderLabel, getRootFolders } from './galleryFolderUtils';

const chipStyle = (active: boolean): CSSProperties => ({
    height: 26,
    padding: '0 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
});

const GalleryFolderBar = () => {
    const { data, currentFolder, setCurrentFolder, setSelectedImages } = useGalleryContext();

    const rootFolders = useMemo(() => getRootFolders(data), [data]);
    const childFolders = useMemo(() => getChildFolders(data, currentFolder), [data, currentFolder]);
    const ancestorFolders = useMemo(() => {
        const parts = currentFolder.split('/').filter(Boolean);
        return parts.map((_, index) => parts.slice(0, index + 1).join('/')).slice(1);
    }, [currentFolder]);

    const selectFolder = (folder: string) => {
        setSelectedImages([]);
        setCurrentFolder(folder);
    };

    if (!rootFolders.length) return null;

    return (
        <Flex
            align="center"
            gap={8}
            wrap="wrap"
            style={{
                borderTop: '1px solid rgba(127, 127, 127, 0.18)',
                paddingTop: 8,
                rowGap: 6,
            }}
        >
            <Typography.Text
                type="secondary"
                style={{
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                }}
            >
                <FolderOutlined />
                Folders
            </Typography.Text>
            {rootFolders.map(folder => (
                <Button
                    key={folder}
                    size="small"
                    type={currentFolder === folder || currentFolder.startsWith(`${folder}/`) ? 'primary' : 'default'}
                    onClick={() => selectFolder(folder)}
                    style={chipStyle(currentFolder === folder || currentFolder.startsWith(`${folder}/`))}
                >
                    {getFolderLabel(folder)}
                </Button>
            ))}
            {ancestorFolders.length > 0 && (
                <Flex align="center" gap={4} wrap="wrap">
                    <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        Path
                    </Typography.Text>
                    {ancestorFolders.map(folder => (
                        <Button
                            key={folder}
                            size="small"
                            type={folder === currentFolder ? 'primary' : 'text'}
                            onClick={() => selectFolder(folder)}
                            style={chipStyle(folder === currentFolder)}
                        >
                            {getFolderLabel(folder)}
                        </Button>
                    ))}
                </Flex>
            )}
            {childFolders.length > 0 && (
                <>
                    <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        Subfolders
                    </Typography.Text>
                    {childFolders.map(folder => (
                        <Button
                            key={folder}
                            size="small"
                            type={folder === currentFolder ? 'primary' : 'default'}
                            onClick={() => selectFolder(folder)}
                            style={chipStyle(folder === currentFolder)}
                        >
                            {getFolderLabel(folder)}
                        </Button>
                    ))}
                </>
            )}
        </Flex>
    );
};

export default GalleryFolderBar;
