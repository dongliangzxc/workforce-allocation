import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Archive, Trash2, ChevronRight, Users, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore.js';
import Modal from '../../components/Modal.jsx';

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
}

export default function History() {
    const navigate = useNavigate();
    const { history, deleteHistoryEntry } = useAppStore();
    const [deleteTarget, setDeleteTarget] = useState(null);

    // 按 savedAt 降序（store 中已是 unshift 插入，保持即可）
    const sorted = [...history].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">历史记录</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        已归档 {history.length} 条，点击查看当时的需求与甘特图
                    </p>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-14 h-14 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
                        <Archive size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">还没有归档记录</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                        完成每周排期后，点击顶栏的「归档本周」按钮保存快照，以便日后回顾
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {sorted.map((entry) => (
                            <motion.div
                                key={entry.id}
                                initial={{opacity: 0, y: 6}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, scale: 0.97}}
                                transition={{duration: 0.18}}
                                className="card hover:shadow-md transition-all group cursor-pointer"
                                onClick={() => navigate(`/history/${entry.id}`)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                                        <Archive size={18} className="text-primary-500" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-semibold text-foreground">{entry.name}</h3>
                                            <span className="text-xs text-muted-foreground">{formatDate(entry.savedAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="flex items-center gap-1 text-xs text-secondary-500">
                                                <Users size={11} />{entry.members?.length ?? 0} 位成员
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-secondary-500">
                                                <ClipboardList size={11} />{entry.requirements?.length ?? 0} 条需求
                                            </span>
                                            {entry.llmSummary && (
                                                <span className="text-xs text-muted-foreground truncate max-w-xs hidden sm:block">
                                                    {entry.llmSummary.slice(0, 40)}{entry.llmSummary.length > 40 ? '…' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className="text-secondary-400 ml-1" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Delete confirm */}
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="删除归档记录"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
                        <button
                            className="btn-danger"
                            onClick={() => { deleteHistoryEntry(deleteTarget.id); setDeleteTarget(null); }}
                        >
                            确认删除
                        </button>
                    </>
                }
            >
                <p className="text-sm text-secondary-600">
                    确认删除归档记录
                    <span className="font-semibold text-foreground">「{deleteTarget?.name}」</span>？
                    <br />此操作不可撤销。
                </p>
            </Modal>
        </div>
    );
}
