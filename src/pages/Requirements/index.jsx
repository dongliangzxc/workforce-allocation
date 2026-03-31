import { useState } from 'react';
import { Plus, ClipboardList, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore.js';
import { RequirementModal } from './components/RequirementModal.jsx';
import { ScreenshotRequirementModal } from './components/ScreenshotRequirementModal.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import Modal from '../../components/Modal.jsx';
import { getDefaultSkillColor } from '../../types/index.js';
import { cn } from '@utils/cn.js';

export default function Requirements() {
    const { requirements, llmConfig, addRequirement, updateRequirement, deleteRequirement } = useAppStore();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [noLLMTip, setNoLLMTip] = useState(false);

    const sorted = [...requirements].sort((a, b) => a.priority - b.priority);

    const handleSave = (form) => {
        if (editing) updateRequirement(editing.id, form);
        else addRequirement(form);
        setEditing(null);
    };

    const handleEdit = (req) => { setEditing(req); setModalOpen(true); };

    const handleOpenImport = () => {
        if (!llmConfig?.baseURL || !llmConfig?.apiKey) {
            setNoLLMTip(true);
            return;
        }
        setImportOpen(true);
    };

    // 批量导入回调：逐项 addRequirement 或 updateRequirement（按名称去重）
    const handleImportRequirements = (items) => {
        items.forEach(({name, direction, priority, mandays, isUpdate}) => {
            const description = direction ? `方向：${direction}` : '';
            if (isUpdate) {
                const existing = requirements.find(r => r.name === name);
                if (existing) updateRequirement(existing.id, {priority, mandays});
            } else {
                addRequirement({
                    name,
                    description,
                    priority,
                    mandays,
                    mustThisWeek: true,
                    requiredSkills: [],
                });
            }
        });
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">需求列表</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">录入下周需求，按优先级（数值越小越紧急）排序</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn-secondary"
                        onClick={handleOpenImport}
                        title="上传排期截图，AI 自动识别需求清单"
                    >
                        <ImagePlus size={15} />
                        从截图导入
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => { setEditing(null); setModalOpen(true); }}
                    >
                        <Plus size={16} />添加需求
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-center">
                    <div className="w-14 h-14 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
                        <ClipboardList size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">还没有需求</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">添加下周需要完成的需求，填写描述、人天和所需技能</p>
                    <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
                        <Plus size={15} />添加第一个需求
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                        {sorted.map((req) => (
                            <motion.div
                                key={req.id}
                                initial={{opacity: 0, y: 8}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, scale: 0.95}}
                                transition={{duration: 0.2}}
                                className="card hover:shadow-md transition-all group"
                            >
                                {/* Top row */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                                            style={{backgroundColor: req.color || '#6366f1'}}
                                        />
                                        <h3 className="font-semibold text-sm text-foreground truncate">{req.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(req)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 text-muted-foreground hover:text-primary-600 transition-colors">
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={() => setDeleteTarget(req)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                {req.description && (
                                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                                        {req.description}
                                    </p>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <PriorityBadge value={req.priority} />
                                    <span className="badge bg-primary-50 text-primary-600">
                                        {req.mandays} 人天
                                    </span>
                                    {req.mustThisWeek === false
                                        ? <span className="badge bg-secondary-100 text-secondary-500">可跨周</span>
                                        : <span className="badge bg-red-50 text-red-600">本周必完</span>
                                    }
                                    {req.requiredSkills.map(s => (
                                        <span key={s} className={cn('badge', getDefaultSkillColor(s))}>{s}</span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Screenshot import modal */}
            <ScreenshotRequirementModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                llmConfig={llmConfig}
                existingRequirements={requirements}
                onImport={handleImportRequirements}
            />

            {/* No LLM config tip */}
            <Modal
                open={noLLMTip}
                onClose={() => setNoLLMTip(false)}
                title="需要先配置 AI"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setNoLLMTip(false)}>取消</button>
                        <button className="btn-primary" onClick={() => { setNoLLMTip(false); navigate('/settings'); }}>
                            去配置
                        </button>
                    </>
                }
            >
                <p className="text-sm text-secondary-600">
                    截图识别功能需要 AI 模型支持，请先前往「设置」页面填写 API 地址和密钥。
                </p>
            </Modal>

            {/* Requirement edit modal */}
            <RequirementModal
                open={modalOpen}
                requirement={editing}
                onClose={() => { setModalOpen(false); setEditing(null); }}
                onSave={handleSave}
            />
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="删除需求"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
                        <button className="btn-danger" onClick={() => { deleteRequirement(deleteTarget.id); setDeleteTarget(null); }}>
                            确认删除
                        </button>
                    </>
                }
            >
                <p className="text-sm text-secondary-600">
                    确认删除需求 <span className="font-semibold text-foreground">「{deleteTarget?.name}」</span>？
                    <br />相关的分配记录也将一并删除，此操作不可撤销。
                </p>
            </Modal>
        </div>
    );
}
