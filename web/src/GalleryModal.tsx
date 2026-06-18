import Modal from 'antd/es/modal/Modal';
import Layout from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import { useGalleryContext } from './GalleryContext';
import GalleryHeader from './GalleryHeader';
import GallerySidebar from './GallerySidebar';
import GalleryImageGrid from './GalleryImageGrid';
import GallerySettingsModal from './GallerySettingsModal';
import { BASE_Z_INDEX } from './ComfyAppApi';

const GalleryModal = () => {
    const { open, setOpen, size, showSettings, siderCollapsed, setSiderCollapsed } = useGalleryContext();

    return (
        <>
        <Modal
            zIndex={BASE_Z_INDEX}
            title={<GalleryHeader />}
            centered={false}
            open={open}
            closable={false}
            afterOpenChange={setOpen}
            onOk={() => setOpen(false)}
            onCancel={() => setOpen(false)}
            width={size?.width}
            style={{
                top: 12,
                maxWidth: 'calc(100vw - 24px)',
            }}
            styles={{
                content: {
                    height: 'calc(100vh - 48px)',
                    maxHeight: 'calc(100vh - 48px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                },
                header: {
                    flex: '0 0 auto',
                },
                body: {
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflow: 'hidden',
                    padding: 0,
                },
            }}
            footer={null}
        >
            <Layout
                style={{
                    borderRadius: 8,
                    overflowX: "hidden",
                    overflowY: "hidden",
                    width: '100%',
                    height: "100%",
                    minHeight: 0,
                }}
            >
                <Sider 
                    collapsed={siderCollapsed}
                    collapsedWidth={0}
                    width="20%" 
                    style={{ 
                        overflow: 'auto', 
                        position: 'sticky', 
                        insetInlineStart: 0, 
                        top: 0, 
                        bottom: 0, 
                        scrollbarWidth: 'thin', 
                        scrollbarGutter: 'stable', 
                        background: "transparent" 
                    }}
                >
                    <GallerySidebar />
                </Sider>
                <GalleryImageGrid />
            </Layout>
        </Modal>
            {showSettings && <GallerySettingsModal />}
        </>
    );
};

export default GalleryModal;
