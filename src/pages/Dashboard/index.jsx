import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, ClipboardList, Kanban, GanttChartSquare, AlertTriangle, CheckCircle, Edit2, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { cn } from '@utils/cn.js';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const navigate = useNavigate();
    const { weekLabel, setWeekLabel, members, requirements, allocations } = useAppStore();
    const [editingLabel, setEditingLabel] = useState(false);
    const [labelInput, setLabelInput] = useState(weekLabel);

    const totalRequired = requirements.reduce((s, r) => s + r.mandays, 0);
    const totalAvailable = members.reduce((s, m) => s + m.availableDays, 0);
    const totalAllocated = allocations.reduce((s, a) => s + a.allocatedDays, 0);
    const hasGap = totalRequired > totalAvailable;

    const confirmLabel = () => {
        if (labelInput.trim()) setWeekLabel(labelInput.trim());
        else setLabelInput(weekLabel);
        setEditingLabel(false);
    };

    const stats = [
        {
            label: '需求总数',
            value: requirements.length,
            icon: ClipboardList,
            color: 'bg-primary-50 text-primary-600',
            ring: 'ring-primary-100',
            action: () => navigate('/requirements'),
        },
        {
            label: '团队成员',
            value: members.length,
            icon: Users,
            color: 'bg-emerald-50 text-emerald-600',
            ring: 'ring-emerald-100',
            action: () => navigate('/members'),
        },
        {
            label: '需求总人天',
            value: totalRequired,
            icon: ClipboardList,
            unit: '天',
            color: 'bg-accent-50 text-accent-600',
            ring: 'ring-accent-100',
            action: () => navigate('/requirements'),
        },
        {
            label: '可用总人天',
            value: totalAvailable,
            icon: Users,
            unit: '天',
            color: 'bg-sky-50 text-sky-600',
            ring: 'ring-sky-100',
            action: () => navigate('/members'),
        },
    ];

    const quickActions = [
        {label: '管理成员',  icon: Users,            path: '/members',      desc: '添加成员与技能标签'},
        {label: '管理需求',  icon: ClipboardList,    path: '/requirements', desc: '录入下周需求与人天'},
        {label: '开始分配',  icon: Kanban,           path: '/allocation',   desc: 'LLM 智能人力分配'},
        {label: '查看甘特图',icon: GanttChartSquare, path: '/gantt',        desc: '可视化周期安排'},
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* ── Header ── */}
            <motion.div
                initial={{opacity: 0, y: -12}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4}}
                className="flex items-start justify-between"
            >
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">当前规划周期</p>
                    {editingLabel ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={labelInput}
                                onChange={e => setLabelInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmLabel()}
                                className="text-2xl font-bold text-foreground bg-transparent border-b-2 border-primary-400 outline-none w-56"
                            />
                            <button onClick={confirmLabel} className="w-7 h-7 flex items-center justify-center rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 transition-colors">
                                <Check size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setLabelInput(weekLabel); setEditingLabel(true); }}
                            className="flex items-center gap-2 group"
                        >
                            <h1 className="text-2xl font-bold text-foreground">{weekLabel}</h1>
                            <Edit2 size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>
                <div className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                    hasGap
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                        : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
                )}>
                    {hasGap
                        ? <><AlertTriangle size={15} /> 人力缺口 {totalRequired - totalAvailable} 天</>
                        : <><CheckCircle size={15} /> 人力充足</>
                    }
                </div>
            </motion.div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <motion.button
                        key={s.label}
                        initial={{opacity: 0, y: 12}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.4, delay: i * 0.07}}
                        onClick={s.action}
                        className={cn('card text-left hover:shadow-md transition-all cursor-pointer ring-1', s.ring)}
                    >
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.color)}>
                            <s.icon size={17} />
                        </div>
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                            {s.value}<span className="text-sm font-normal text-muted-foreground ml-1">{s.unit || ''}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </motion.button>
                ))}
            </div>

            {/* ── Progress bar ── */}
            {(totalRequired > 0 || totalAvailable > 0) && (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{delay: 0.3}}
                    className="card"
                >
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">人力分配进度</p>
                        <p className="text-xs text-muted-foreground">
                            已分配 {totalAllocated} / 需求 {totalRequired} 人天
                        </p>
                    </div>
                    <div className="space-y-2">
                        {/* Allocation progress */}
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>已分配</span>
                                <span>{totalRequired > 0 ? Math.round(totalAllocated / totalRequired * 100) : 0}%</span>
                            </div>
                            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all duration-700"
                                    style={{width: `${totalRequired > 0 ? Math.min(totalAllocated / totalRequired * 100, 100) : 0}%`}}
                                />
                            </div>
                        </div>
                        {/* Capacity utilization */}
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>人力利用率</span>
                                <span>{totalAvailable > 0 ? Math.round(totalRequired / totalAvailable * 100) : 0}%</span>
                            </div>
                            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all duration-700',
                                        totalRequired > totalAvailable ? 'bg-red-400' : 'bg-emerald-400',
                                    )}
                                    style={{width: `${totalAvailable > 0 ? Math.min(totalRequired / totalAvailable * 100, 100) : 0}%`}}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Quick Actions ── */}
            <div>
                <p className="text-sm font-semibold text-secondary-500 mb-3 uppercase tracking-wider">快速入口</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {quickActions.map((a, i) => (
                        <motion.button
                            key={a.path}
                            initial={{opacity: 0, scale: 0.95}}
                            animate={{opacity: 1, scale: 1}}
                            transition={{duration: 0.3, delay: 0.2 + i * 0.06}}
                            onClick={() => navigate(a.path)}
                            className="card text-left hover:shadow-md hover:border-primary-200 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                                <a.icon size={16} className="text-primary-600" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{a.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
