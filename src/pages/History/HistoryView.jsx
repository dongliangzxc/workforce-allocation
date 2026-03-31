import { useParams, Link } from 'react-router';
import { Archive, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import GanttChart from '../../components/GanttChart.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import { getDefaultSkillColor } from '../../types/index.js';
import { cn } from '@utils/cn.js';

function formatDate(iso) {
    return new Date(iso).toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function HistoryView() {
    const { id } = useParams();
    const { history } = useAppStore();
    const entry = history.find(e => e.id === id);
    const [summaryOpen, setSummaryOpen] = useState(true);

    if (!entry) {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-center">
                <div className="w-14 h-14 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
                    <Archive size={24} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">记录不存在</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">该归档记录可能已被删除</p>
                <Link to="/history" className="btn-secondary text-sm">
                    <ChevronLeft size={14} />返回历史记录
                </Link>
            </div>
        );
    }

    const sortedReqs = [...(entry.requirements ?? [])].sort((a, b) => a.priority - b.priority);
    const hasGantt   = entry.allocations?.length > 0 && entry.members?.length > 0;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Breadcrumb */}
            <div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                    <Link to="/history" className="hover:text-foreground transition-colors">历史记录</Link>
                    <ChevronLeft size={13} className="rotate-180" />
                    <span className="text-foreground font-medium">{entry.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">归档于 {formatDate(entry.savedAt)}</p>
            </div>

            {/* AI Summary */}
            {entry.llmSummary && (
                <section className="card">
                    <button
                        className="w-full flex items-center justify-between text-left"
                        onClick={() => setSummaryOpen(v => !v)}
                    >
                        <h2 className="text-sm font-semibold text-foreground">AI 分配摘要</h2>
                        {summaryOpen
                            ? <ChevronUp size={15} className="text-muted-foreground" />
                            : <ChevronDown size={15} className="text-muted-foreground" />
                        }
                    </button>
                    {summaryOpen && (
                        <p className="mt-3 text-sm text-secondary-600 leading-relaxed whitespace-pre-wrap">
                            {entry.llmSummary}
                        </p>
                    )}
                </section>
            )}

            {/* Requirements (read-only) */}
            <section>
                <h2 className="text-sm font-semibold text-foreground mb-3">
                    需求列表
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({sortedReqs.length} 条)</span>
                </h2>
                {sortedReqs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">该归档未包含需求数据</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedReqs.map(req => (
                            <div key={req.id} className="card">
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                                        style={{backgroundColor: req.color || '#6366f1'}}
                                    />
                                    <h3 className="font-semibold text-sm text-foreground truncate">{req.name}</h3>
                                </div>
                                {req.description && (
                                    <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                                        {req.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <PriorityBadge value={req.priority} />
                                    <span className="badge bg-primary-50 text-primary-600">{req.mandays} 人天</span>
                                    {req.mustThisWeek === false
                                        ? <span className="badge bg-secondary-100 text-secondary-500">可跨周</span>
                                        : <span className="badge bg-red-50 text-red-600">本周必完</span>
                                    }
                                    {(req.requiredSkills ?? []).map(s => (
                                        <span key={s} className={cn('badge', getDefaultSkillColor(s))}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Gantt (read-only, reuse component) */}
            <section>
                <h2 className="text-sm font-semibold text-foreground mb-3">甘特图</h2>
                {hasGantt ? (
                    <div className="card p-0 overflow-hidden">
                        <GanttChart
                            allocations={entry.allocations}
                            requirements={entry.requirements}
                            members={entry.members}
                            weekLabel={entry.weekLabel}
                        />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">该归档未包含分配数据</p>
                )}
            </section>
        </div>
    );
}
