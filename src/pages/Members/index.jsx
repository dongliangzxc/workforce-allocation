import { useState } from 'react';
import { Plus, Users, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore.js';
import { MemberCard } from './components/MemberCard.jsx';
import { MemberModal } from './components/MemberModal.jsx';
import { ScreenshotImportModal } from './components/ScreenshotImportModal.jsx';
import Modal from '../../components/Modal.jsx';

export default function Members() {
    const navigate = useNavigate();
    const { members, llmConfig, addMember, updateMember, deleteMember } = useAppStore();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    // 未配置 LLM 时的提示
    const [noLLMTip, setNoLLMTip] = useState(false);

    const handleSave = (form) => {
        if (editing) {
            updateMember(editing.id, form);
        } else {
            addMember(form);
        }
        setEditing(null);
    };

    const handleEdit = (member) => { setEditing(member); setModalOpen(true); };
    const handleDeleteConfirm = () => { deleteMember(deleteTarget.id); setDeleteTarget(null); };

    const handleOpenImport = () => {
        if (!llmConfig?.baseURL || !llmConfig?.apiKey) {
            setNoLLMTip(true);
            return;
        }
        setImportOpen(true);
    };

    // 批量导入回调
    const handleImport = (items) => {
        items.forEach(({name, availableDays, isUpdate}) => {
            if (isUpdate) {
                const existing = members.find(m => m.name === name);
                if (existing) updateMember(existing.id, {availableDays});
            } else {
                addMember({name, availableDays, role: '', skills: []});
            }
        });
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">团队成员</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">管理成员信息、可用人天与技能标签</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn-secondary"
                        onClick={handleOpenImport}
                        title="上传排期截图，AI 自动识别可安排成员"
                    >
                        <ImagePlus size={15} />
                        从截图导入
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => { setEditing(null); setModalOpen(true); }}
                    >
                        <Plus size={16} />
                        添加成员
                    </button>
                </div>
            </div>

            {/* Grid */}
            {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-center">
                    <div className="w-14 h-14 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
                        <Users size={24} className="text-muted-foreground" />
                    </div>
                            <p className="text-sm font-medium text-foreground">还没有成员</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">手动添加成员，或上传排期截图让 AI 自动识别</p>
                    <div className="flex gap-2">
                        <button className="btn-secondary" onClick={handleOpenImport}>
                            <ImagePlus size={15} />从截图导入
                        </button>
                        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
                            <Plus size={15} />添加成员
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {members.map((m) => (
                            <motion.div
                                key={m.id}
                                initial={{opacity: 0, scale: 0.95}}
                                animate={{opacity: 1, scale: 1}}
                                exit={{opacity: 0, scale: 0.95}}
                                transition={{duration: 0.2}}
                            >
                                <MemberCard
                                    member={m}
                                    onEdit={handleEdit}
                                    onDelete={setDeleteTarget}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <MemberModal
                open={modalOpen}
                member={editing}
                onClose={() => { setModalOpen(false); setEditing(null); }}
                onSave={handleSave}
            />

            {/* Screenshot Import Modal */}
            <ScreenshotImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                llmConfig={llmConfig}
                existingMembers={members}
                onImport={handleImport}
            />

            {/* No LLM Config Tip */}
            <Modal
                open={noLLMTip}
                onClose={() => setNoLLMTip(false)}
                title="需要配置 LLM 服务"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setNoLLMTip(false)}>取消</button>
                        <button className="btn-primary" onClick={() => { setNoLLMTip(false); navigate('/settings'); }}>
                            前往设置
                        </button>
                    </>
                }
            >
                <p className="text-sm text-secondary-600">
                    截图导入功能需要 LLM Vision 服务来识别图片内容。
                    <br />请先在设置页配置 BaseURL、API Key 和模型名称。
                </p>
            </Modal>

            {/* Delete Confirm */}
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="删除成员"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
                        <button className="btn-danger" onClick={handleDeleteConfirm}>确认删除</button>
                    </>
                }
            >
                <p className="text-sm text-secondary-600">
                    确认删除成员 <span className="font-semibold text-foreground">「{deleteTarget?.name}」</span>？
                    <br />相关的分配记录也将一并删除，此操作不可撤销。
                </p>
            </Modal>
        </div>
    );
}
