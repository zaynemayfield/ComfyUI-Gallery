import { Button, Flex, Input, Popconfirm, Tooltip, Typography, message } from 'antd';
import { BranchesOutlined, DeleteOutlined, EditOutlined, FolderAddOutlined, FolderOpenOutlined, FolderOutlined, RetweetOutlined, RightOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useGalleryContext } from './GalleryContext';
import { getChildFolders, getFolderLabel, getRootFolders } from './galleryFolderUtils';
import { ComfyAppApi } from './ComfyAppApi';

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
    const { data, currentFolder, setCurrentFolder, setSelectedImages, runAsync } = useGalleryContext();
    const [showActions, setShowActions] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [renameValue, setRenameValue] = useState("");
    const [moveTarget, setMoveTarget] = useState("");
    const [busy, setBusy] = useState(false);

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

    const refreshFolders = async (nextFolder?: string) => {
        if (nextFolder !== undefined) setCurrentFolder(nextFolder);
        await runAsync();
    };

    const runFolderAction = async (action: () => Promise<unknown>, success: string, nextFolder?: string) => {
        setBusy(true);
        try {
            await action();
            message.success(success);
            await refreshFolders(nextFolder);
        } catch (error: any) {
            message.error(error?.message || "Folder action failed");
        } finally {
            setBusy(false);
        }
    };

    const parentFolder = currentFolder.split('/').slice(0, -1).join('/');
    const isRootFolder = currentFolder === activeRoot;

    if (!rootFolders.length) return null;

    return (
        <Flex vertical gap={5}>
            <Flex
                align="center"
                gap={6}
                wrap="wrap"
                style={{
                    borderTop: '1px solid rgba(127, 127, 127, 0.18)',
                    paddingTop: 7,
                    paddingBottom: 2,
                    minHeight: 32,
                    rowGap: 4,
                }}
            >
                <Tooltip title="Folder actions" placement="bottom">
                    <Button
                        size="small"
                        type={showActions ? 'primary' : 'text'}
                        icon={<FolderOutlined />}
                        onClick={() => setShowActions(prev => !prev)}
                        aria-label="Folder actions"
                        style={{ width: 24, height: 24 }}
                    />
                </Tooltip>
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
                {(ancestorFolders.length > 0 || childFolders.length > 0) && (
                    <>
                        <RightOutlined style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }} />
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
                                {(index > 0 || ancestorFolders.length > 0) && <Separator />}
                                <FolderButton
                                    active={folder === currentFolder}
                                    onClick={() => selectFolder(folder)}
                                >
                                    <FolderOpenOutlined style={{ marginRight: 5 }} />
                                    {getFolderLabel(folder)}
                                </FolderButton>
                            </span>
                        ))}
                    </>
                )}
            </Flex>
            {showActions && (
                <Flex
                    align="center"
                    gap={8}
                    wrap="wrap"
                    style={{
                        minHeight: 34,
                        padding: '5px 8px',
                        border: '1px solid rgba(105, 177, 255, 0.22)',
                        background: 'rgba(22, 119, 255, 0.06)',
                        borderRadius: 4,
                    }}
                >
                    <Typography.Text style={{ fontSize: 12, fontWeight: 600 }}>
                        {currentFolder || 'output'}
                    </Typography.Text>
                    <Input
                        size="small"
                        value={newFolderName}
                        onChange={event => setNewFolderName(event.target.value)}
                        placeholder="New folder"
                        style={{ width: 130 }}
                    />
                    <Button
                        size="small"
                        icon={<FolderAddOutlined />}
                        loading={busy}
                        onClick={() => runFolderAction(
                            async () => {
                                await ComfyAppApi.createFolder(currentFolder, newFolderName);
                                setNewFolderName("");
                            },
                            "Folder created",
                            currentFolder
                        )}
                    >
                        Create
                    </Button>
                    <Input
                        size="small"
                        value={renameValue}
                        onChange={event => setRenameValue(event.target.value)}
                        placeholder="Rename to"
                        style={{ width: 130 }}
                    />
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        loading={busy}
                        disabled={isRootFolder}
                        onClick={() => runFolderAction(
                            async () => {
                                await ComfyAppApi.renameFolder(currentFolder, renameValue);
                                setRenameValue("");
                            },
                            "Folder renamed",
                            parentFolder ? `${parentFolder}/${renameValue}` : renameValue
                        )}
                    >
                        Rename
                    </Button>
                    <Input
                        size="small"
                        value={moveTarget}
                        onChange={event => setMoveTarget(event.target.value)}
                        placeholder="Move into folder"
                        style={{ width: 145 }}
                    />
                    <Button
                        size="small"
                        icon={<RetweetOutlined />}
                        loading={busy}
                        disabled={isRootFolder}
                        onClick={() => runFolderAction(
                            async () => {
                                await ComfyAppApi.moveFolder(currentFolder, moveTarget);
                                setMoveTarget("");
                            },
                            "Folder moved",
                            moveTarget ? `${moveTarget}/${getFolderLabel(currentFolder)}` : getFolderLabel(currentFolder)
                        )}
                    >
                        Move
                    </Button>
                    <Popconfirm
                        title="Delete folder"
                        description={`Delete ${currentFolder}? This removes the folder and its contents.`}
                        okText="Delete"
                        okButtonProps={{ danger: true, loading: busy }}
                        onConfirm={() => runFolderAction(
                            () => ComfyAppApi.deleteFolder(currentFolder),
                            "Folder deleted",
                            parentFolder
                        )}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />} loading={busy} disabled={isRootFolder}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Flex>
            )}
        </Flex>
    );
};

export default GalleryFolderBar;
