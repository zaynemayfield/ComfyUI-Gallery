import { Button, Flex, Input, Modal, Popconfirm, Tree, Tooltip, Typography, message } from 'antd';
import { BranchesOutlined, DeleteOutlined, EditOutlined, FolderAddOutlined, FolderOpenOutlined, FolderOutlined, RetweetOutlined, RightOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { CSSProperties, Key, ReactNode } from 'react';
import { useGalleryContext } from './GalleryContext';
import { getChildFolders, getFolderKeys, getFolderLabel, getRootFolders } from './galleryFolderUtils';
import { ComfyAppApi } from './ComfyAppApi';

const ROOT_TREE_KEY = "__gallery_root__";

type MoveTreeNode = {
    title: ReactNode;
    key: string;
    icon?: ReactNode;
    children?: MoveTreeNode[];
    disabled?: boolean;
    selectable?: boolean;
};

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

const ActionDivider = () => (
    <span
        aria-hidden="true"
        style={{
            width: 1,
            height: 24,
            margin: '0 4px',
            background: 'rgba(5, 5, 5, 0.18)',
        }}
    />
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

const joinFolderPath = (parentPath: string, childName: string) => (
    parentPath ? `${parentPath}/${childName}` : childName
);

const treeKeyToFolderPath = (key: string) => (
    key === ROOT_TREE_KEY ? "" : key
);

const folderPathToTreeKey = (folderPath: string | null) => (
    folderPath ? folderPath : ROOT_TREE_KEY
);

const isDescendantFolder = (folderPath: string, parentPath: string) => (
    Boolean(parentPath) && folderPath.startsWith(`${parentPath}/`)
);

const getAncestorTreeKeys = (folderPath: string | null) => {
    if (folderPath === null) return [ROOT_TREE_KEY];
    const parts = folderPath.split('/').filter(Boolean);
    const keys = [ROOT_TREE_KEY];
    for (let index = 0; index < parts.length; index++) {
        keys.push(parts.slice(0, index + 1).join('/'));
    }
    return keys;
};

const buildMoveTreeData = (
    folderKeys: string[],
    currentFolder: string,
    selectedTargetParent: string | null,
    parentFolder: string,
) => {
    const currentFolderName = getFolderLabel(currentFolder);
    const folderSet = new Set(folderKeys);
    const nodeMap = new Map<string, MoveTreeNode>();
    const targetPath = selectedTargetParent === null ? null : joinFolderPath(selectedTargetParent, currentFolderName);
    const selectedTargetIsValid = selectedTargetParent !== null
        && selectedTargetParent !== parentFolder
        && selectedTargetParent !== currentFolder
        && !isDescendantFolder(selectedTargetParent, currentFolder)
        && !folderSet.has(targetPath ?? "");

    const makeTitle = (label: string, folderPath: string) => {
        const invalidTarget = folderPath === currentFolder || isDescendantFolder(folderPath, currentFolder);
        const sameParent = folderPath === parentFolder;
        const wouldConflict = folderSet.has(joinFolderPath(folderPath, currentFolderName));
        const disabled = invalidTarget || sameParent || wouldConflict;

        return {
            disabled,
            title: (
                <span style={{ opacity: disabled ? 0.45 : 1 }}>
                    {label}
                </span>
            ),
        };
    };

    const rootConflict = folderSet.has(currentFolderName);
    const rootDisabled = parentFolder === "" || rootConflict;
    const rootNode: MoveTreeNode = {
        title: <span style={{ opacity: rootDisabled ? 0.45 : 1 }}>output</span>,
        key: ROOT_TREE_KEY,
        icon: <FolderOutlined />,
        children: [],
        disabled: rootDisabled,
    };

    nodeMap.set(ROOT_TREE_KEY, rootNode);

    folderKeys.forEach(fullPath => {
        const segments = fullPath.split('/').filter(Boolean);
        let currentPath = "";

        segments.forEach((segment, index) => {
            currentPath = index === 0 ? segment : `${currentPath}/${segment}`;
            if (nodeMap.has(currentPath)) return;

            const titleState = makeTitle(segment, currentPath);
            const newNode: MoveTreeNode = {
                title: titleState.title,
                key: currentPath,
                icon: <FolderOutlined />,
                children: [],
                disabled: titleState.disabled,
            };

            nodeMap.set(currentPath, newNode);
            const parentPath = index === 0 ? ROOT_TREE_KEY : segments.slice(0, index).join('/');
            nodeMap.get(parentPath)?.children?.push(newNode);
        });
    });

    if (selectedTargetIsValid) {
        const previewParentKey = folderPathToTreeKey(selectedTargetParent);
        nodeMap.get(previewParentKey)?.children?.push({
            title: (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '1px 6px',
                        borderRadius: 3,
                        color: '#1677ff',
                        background: 'rgba(22, 119, 255, 0.12)',
                        border: '1px dashed rgba(22, 119, 255, 0.55)',
                    }}
                >
                    <RetweetOutlined />
                    {currentFolderName}
                </span>
            ),
            key: `__move_preview__/${targetPath}`,
            icon: <FolderOpenOutlined />,
            selectable: false,
            disabled: true,
        });
    }

    return {
        treeData: [rootNode],
        selectedTargetIsValid,
        targetPath,
    };
};

const GalleryFolderBar = () => {
    const { data, currentFolder, setCurrentFolder, setSelectedImages, runAsync } = useGalleryContext();
    const [showActions, setShowActions] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [renameValue, setRenameValue] = useState("");
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [moveTargetParent, setMoveTargetParent] = useState<string | null>(null);
    const [moveExpandedKeys, setMoveExpandedKeys] = useState<Key[]>([]);
    const [busy, setBusy] = useState(false);

    const rootFolders = useMemo(() => getRootFolders(data), [data]);
    const folderKeys = useMemo(() => getFolderKeys(data), [data]);
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
            return true;
        } catch (error: any) {
            message.error(error?.message || "Folder action failed");
            return false;
        } finally {
            setBusy(false);
        }
    };

    const parentFolder = currentFolder.split('/').slice(0, -1).join('/');
    const isRootFolder = currentFolder === activeRoot;
    const moveTree = useMemo(
        () => buildMoveTreeData(folderKeys, currentFolder, moveTargetParent, parentFolder),
        [folderKeys, currentFolder, moveTargetParent, parentFolder]
    );

    const openMoveDialog = () => {
        setMoveTargetParent(null);
        setMoveExpandedKeys(getAncestorTreeKeys(currentFolder));
        setMoveModalOpen(true);
    };

    const closeMoveDialog = () => {
        setMoveModalOpen(false);
        setMoveTargetParent(null);
        setMoveExpandedKeys([]);
    };

    const selectMoveTarget = (targetParent: string) => {
        setMoveTargetParent(targetParent);
        setMoveExpandedKeys(previousKeys => Array.from(new Set([
            ...previousKeys.map(String),
            ...getAncestorTreeKeys(targetParent),
        ])));
    };

    const handleMoveFolder = async () => {
        if (!moveTree.selectedTargetIsValid || moveTargetParent === null) return;
        const moved = await runFolderAction(
            async () => {
                await ComfyAppApi.moveFolder(currentFolder, moveTargetParent);
            },
            "Folder moved",
            moveTree.targetPath ?? undefined
        );
        if (moved) closeMoveDialog();
    };

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
                    <ActionDivider />
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
                    <ActionDivider />
                    <Button
                        size="small"
                        icon={<RetweetOutlined />}
                        disabled={isRootFolder}
                        onClick={openMoveDialog}
                    >
                        Move
                    </Button>
                    <ActionDivider />
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
            <Modal
                title={`Move ${getFolderLabel(currentFolder)}`}
                open={moveModalOpen}
                onCancel={closeMoveDialog}
                onOk={handleMoveFolder}
                okText="Move"
                okButtonProps={{ disabled: !moveTree.selectedTargetIsValid, loading: busy }}
                cancelButtonProps={{ disabled: busy }}
                width={520}
                destroyOnHidden
            >
                <Flex vertical gap={10}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {currentFolder}
                    </Typography.Text>
                    <div
                        style={{
                            maxHeight: 340,
                            overflow: 'auto',
                            padding: 8,
                            border: '1px solid rgba(127, 127, 127, 0.18)',
                            borderRadius: 4,
                            background: 'rgba(127, 127, 127, 0.04)',
                        }}
                    >
                        <Tree.DirectoryTree
                            showIcon
                            showLine
                            blockNode
                            expandedKeys={moveExpandedKeys}
                            selectedKeys={moveTargetParent === null ? [] : [folderPathToTreeKey(moveTargetParent)]}
                            treeData={moveTree.treeData}
                            expandAction={false}
                            onExpand={(keys) => setMoveExpandedKeys(keys)}
                            onSelect={(keys) => {
                                if (keys.length > 0) selectMoveTarget(treeKeyToFolderPath(String(keys[0])));
                            }}
                        />
                    </div>
                    {moveTargetParent !== null && (
                        <Typography.Text
                            type={moveTree.selectedTargetIsValid ? undefined : "danger"}
                            style={{ fontSize: 12 }}
                        >
                            {moveTree.selectedTargetIsValid
                                ? `${currentFolder} -> ${moveTree.targetPath}`
                                : "Choose a different destination. A folder cannot move into itself, stay in the same parent, or overwrite an existing folder."}
                        </Typography.Text>
                    )}
                </Flex>
            </Modal>
        </Flex>
    );
};

export default GalleryFolderBar;
