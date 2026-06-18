import { Button, Flex, Typography } from 'antd';
import { BranchesOutlined, FolderOpenOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useGalleryContext } from './GalleryContext';
import { getChildFolders, getFolderLabel, getRootFolders } from './galleryFolderUtils';

const chipStyle = (active: boolean): CSSProperties => ({
    height: 24,
    padding: '0 6px',
    borderRadius: 3,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    border: active ? '1px solid rgba(22, 119, 255, 0.55)' : '1px solid transparent',
    background: active ? 'rgba(22, 119, 255, 0.12)' : 'transparent',
    color: active ? '#69b1ff' : undefined,
    boxShadow: 'none',
});

const Separator = () => (
    <Typography.Text type="secondary" style={{ fontSize: 12, opacity: 0.65 }}>
        |
    </Typography.Text>
);

const FolderButton = ({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
}) => (
    <Button
        size="small"
        type="text"
        onClick={onClick}
        style={chipStyle(active)}
    >
        {children}
    </Button>
);

const GalleryFolderBar = () => {
    const { data, currentFolder, setCurrentFolder, setSelectedImages } = useGalleryContext();

    const rootFolders = useMemo(() => getRootFolders(data), [data]);
    const childFolders = useMemo(() => getChildFolders(data, currentFolder), [data, currentFolder]);
    const activeRoot = useMemo(() => currentFolder.split('/').filter(Boolean)[0] || currentFolder, [currentFolder]);
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
            vertical
            gap={4}
            style={{
                borderTop: '1px solid rgba(127, 127, 127, 0.18)',
                paddingTop: 7,
                paddingBottom: 2,
            }}
        >
            <Flex
                align="center"
                gap={6}
                wrap="wrap"
                style={{
                    minHeight: 26,
                }}
            >
                <FolderOutlined style={{ color: '#69b1ff', fontSize: 14 }} />
                {rootFolders.map((folder, index) => (
                    <span key={folder} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {index > 0 && <Separator />}
                        <FolderButton
                            active={activeRoot === folder}
                            onClick={() => selectFolder(folder)}
                        >
                            {getFolderLabel(folder)}
                        </FolderButton>
                    </span>
                ))}
            </Flex>
            {(ancestorFolders.length > 0 || childFolders.length > 0) && (
                <Flex
                    align="center"
                    gap={6}
                    wrap="wrap"
                    style={{
                        minHeight: 26,
                        marginLeft: 20,
                        paddingLeft: 8,
                        borderLeft: '2px solid rgba(105, 177, 255, 0.35)',
                    }}
                >
                    <BranchesOutlined style={{ color: '#69b1ff', fontSize: 13 }} />
                    {ancestorFolders.map((folder, index) => (
                        <span key={folder} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {index > 0 && <RightOutlined style={{ fontSize: 10, opacity: 0.6 }} />}
                            <FolderButton
                                active={folder === currentFolder}
                                onClick={() => selectFolder(folder)}
                            >
                                {getFolderLabel(folder)}
                            </FolderButton>
                        </span>
                    ))}
                    {ancestorFolders.length > 0 && childFolders.length > 0 && (
                        <RightOutlined style={{ fontSize: 10, opacity: 0.6 }} />
                    )}
                    {childFolders.map((folder, index) => (
                        <span key={folder} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {index > 0 && <Separator />}
                            <FolderButton
                                active={folder === currentFolder}
                                onClick={() => selectFolder(folder)}
                            >
                                <FolderOpenOutlined style={{ marginRight: 5 }} />
                                {getFolderLabel(folder)}
                            </FolderButton>
                        </span>
                    ))}
                </Flex>
            )}
        </Flex>
    );
};

export default GalleryFolderBar;
