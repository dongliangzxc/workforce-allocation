import { useState } from 'react';
import { Sparkles, Trash2, AlertCircle, Info, GanttChartSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore.js';
import { autoAllocate } from '../../utils/allocation.js';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import { cn } from '@utils/cn.js';
import { useNavigate } from 'react-router';

function CellInput({value, max, onChange}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const over = value > max;

    if (editing) {
        return (
            <input
                autoFocus
                type="number"
                min="0"
                step="0.5"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={() => {
                    const v = Math.max(0, Number(draft) || 0);
                    onChange(v);
                    setEditing(false);
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') { setEditing(false); }
                }}
                className="w-14 text-center text-xs border border-primary-400 rounded-md px-1 py-1 outline-none"
            />
        );
    }

    return (
        <button
            onClick={() => { setDraft(String(value || '')); setEditing(true); }}
            className={cn(
                'w-14 h-8 rounded-md text-xs font-medium transition-all',
                value > 0
                    ? over
                        ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                        : 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                    : 'bg-secondary-50 text-muted-foreground hover:bg-secondary-100',
            )}
            title={value > 0 ? `${value} 人天${over ? `（超出 ${value - max} 天）` : ''}` : '点击设置'}
        >
            {value > 0 ? value : '—'}
        </button>
    );
}

export default function Allocation() {
    const navigate = useNavigate();
    const { requirements, members, allocations, llmConfig, llmSummary, setAllocations, updateAllocation, clearAllocations } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sortedReqs = [...requirements].sort((a, b) => a.priority - b.priority);

    // Helper: get allocation days for a requirement-member pair
    const getAlloc = (reqId, memberId) => {
        const a = allocations.find(x => x.requirementId === reqId && x.memberId === memberId);
        return a?.allocatedDays || 0;
    };
    const getReason = (reqId, memberId) => {
        const a = allocations.find(x => x.requirementId === reqId && x.memberId === memberId);
        return a?.reason || '';
    };

    // Per-member total allocated
    const memberTotal = (memberId) =>
        allocations.filter(a => a.memberId === memberId).reduce((s, a) => s + a.allocatedDays, 0);

    // Per-requirement total allocated
    const reqTotal = (reqId) =>
        allocations.filter(a => a.requirementId === reqId).reduce((s, a) => s + a.allocatedDays, 0);

    const handleAutoAllocate = async () => {
        if (requirements.length === 0 || members.length === 0) {
            setError('请先添加成员和需求后再执行分配');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await autoAllocate(requirements, members, llmConfig);
            setAllocations(result.allocations, result.summary);
        } catch (e) {
            setError(e.message || '分配失败');
        } finally {
            setLoading(false);
        }
    };

    const noData = requirements.length === 0 || members.length === 0;

    return (
        <div className="p-6 max-w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-xl font-bold text-foreground">分配工作台</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">LLM 智能分配 · 手动微调 · 实时校验</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/gantt')}
                        disabled={allocations.length === 0}
                        title="查看甘特图并导出 PNG"
                    >
                        <GanttChartSquare size={14} />甘特图
                    </button>
                    <button
                        className="btn-danger"
                        onClick={clearAllocations}
                        disabled={allocations.length === 0}
                    >
                        <Trash2 size={14} />清空分配
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleAutoAllocate}
                        disabled={loading || noData}
                    >
                        {loading
                            ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />分析中…</>
                            : <><Sparkles size={15} />智能分配</>
                        }
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4 ring-1 ring-red-200">
                    <AlertCircle size={15} />
                    {error}
                </div>
            )}

            {/* LLM summary */}
            {llmSummary && (
                <motion.div
                    initial={{opacity: 0, y: -6}}
                    animate={{opacity: 1, y: 0}}
                    className="flex items-start gap-3 px-4 py-3.5 bg-primary-50 text-primary-800 text-sm rounded-xl mb-5 ring-1 ring-primary-200"
                >
                    <Sparkles size={15} className="text-primary-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{llmSummary}</p>
                </motion.div>
            )}

            {/* Prompt if no data */}
            {noData ? (
                <div className="card flex flex-col items-center justify-center h-56 text-center gap-3">
                    <Info size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">请先添加成员和需求</p>
                    <div className="flex gap-2">
                        <button className="btn-secondary text-xs" onClick={() => navigate('/members')}>去添加成员</button>
                        <button className="btn-secondary text-xs" onClick={() => navigate('/requirements')}>去添加需求</button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-5">
                    {/* ── Matrix Table ── */}
                    <div className="flex-1 min-w-0 overflow-x-auto">
                        <div className="card p-0 overflow-hidden">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-secondary-50">
                                        <th className="text-left px-4 py-3 font-medium text-secondary-600 border-b border-border min-w-40 sticky left-0 bg-secondary-50 z-10">
                                            需求 / 成员
                                        </th>
                                        {members.map(m => (
                                            <th key={m.id} className="px-3 py-3 font-medium text-secondary-600 border-b border-border text-center min-w-20">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-foreground">{m.name}</span>
                                                    <span className="text-xs text-muted-foreground font-normal">{m.availableDays}天可用</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 font-medium text-secondary-500 border-b border-border text-center min-w-16 text-xs">
                                            已分配
                                        </th>
                                        <th className="px-3 py-3 font-medium text-secondary-500 border-b border-border text-center min-w-16 text-xs">
                                            需求人天
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedReqs.map((req, ri) => {
                                        const allocated = reqTotal(req.id);
                                        const over = allocated > req.mandays;
                                        const under = allocated < req.mandays;

                                        return (
                                            <tr key={req.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'}>
                                                {/* Req name */}
                                                <td className="px-4 py-2.5 border-b border-border sticky left-0 bg-inherit z-10">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{backgroundColor: req.color || '#6366f1'}}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-foreground text-xs truncate max-w-32">{req.name}</p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <PriorityBadge value={req.priority} showLabel={false} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Member cells */}
                                                {members.map(m => {
                                                    const cellVal = getAlloc(req.id, m.id);
                                                    const memberTot = memberTotal(m.id);
                                                    const cellMax = m.availableDays - (memberTot - cellVal);
                                                    const reason = getReason(req.id, m.id);

                                                    return (
                                                        <td key={m.id} className="px-2 py-2 border-b border-border text-center" title={reason || undefined}>
                                                            <CellInput
                                                                value={cellVal}
                                                                max={cellMax}
                                                                onChange={(v) => updateAllocation(req.id, m.id, v, reason)}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                {/* Allocated total */}
                                                <td className="px-2 py-2 border-b border-border text-center">
                                                    <span className={cn(
                                                        'text-xs font-semibold',
                                                        over ? 'text-amber-600' : under && allocated > 0 ? 'text-primary-600' : allocated === req.mandays ? 'text-emerald-600' : 'text-muted-foreground',
                                                    )}>
                                                        {allocated}
                                                    </span>
                                                </td>
                                                {/* Required mandays */}
                                                <td className="px-2 py-2 border-b border-border text-center">
                                                    <span className="text-xs text-muted-foreground">{req.mandays}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {/* Footer: per-member totals */}
                                <tfoot>
                                    <tr className="bg-secondary-50">
                                        <td className="px-4 py-2.5 text-xs font-semibold text-secondary-600 sticky left-0 bg-secondary-50">
                                            已分配合计
                                        </td>
                                        {members.map(m => {
                                            const total = memberTotal(m.id);
                                            const over = total > m.availableDays;
                                            return (
                                                <td key={m.id} className="px-2 py-2.5 text-center">
                                                    <span className={cn(
                                                        'text-xs font-semibold',
                                                        over ? 'text-red-600' : total > 0 ? 'text-primary-600' : 'text-muted-foreground',
                                                    )}>
                                                        {total}
                                                        {over && <span className="text-red-400 ml-0.5">!</span>}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* ── Member Capacity Panel ── */}
                    <div className="w-48 shrink-0 space-y-3">
                        <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">成员人力</p>
                        {members.map(m => {
                            const used = memberTotal(m.id);
                            const pct = m.availableDays > 0 ? Math.min(used / m.availableDays * 100, 100) : 0;
                            const over = used > m.availableDays;

                            return (
                                <div key={m.id} className="card py-3 px-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-xs font-medium text-foreground truncate max-w-24">{m.name}</p>
                                        <p className={cn('text-xs font-semibold tabular-nums', over ? 'text-red-600' : 'text-primary-600')}>
                                            {used}/{m.availableDays}
                                        </p>
                                    </div>
                                    <div className="h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full transition-all duration-500', over ? 'bg-red-400' : 'bg-primary-400')}
                                            style={{width: `${pct}%`}}
                                        />
                                    </div>
                                    {over && (
                                        <p className="text-xs text-red-500 mt-1">超出 {used - m.availableDays} 天</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
