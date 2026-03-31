import { GanttChartSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore.js';
import GanttChart from '../../components/GanttChart.jsx';
import { useNavigate } from 'react-router';

export default function Gantt() {
    const navigate = useNavigate();
    const { requirements, members, allocations, weekLabel } = useAppStore();
    const hasData = allocations.length > 0 && members.length > 0;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{opacity: 0, y: -8}}
                animate={{opacity: 1, y: 0}}
                className="flex items-center justify-between mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                        <GanttChartSquare size={18} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">甘特图</h1>
                        <p className="text-sm text-muted-foreground">{weekLabel} · 工作日安排可视化</p>
                    </div>
                </div>
            </motion.div>

            {/* No data */}
            {!hasData ? (
                <div className="card flex flex-col items-center justify-center h-64 text-center gap-3">
                    <GanttChartSquare size={32} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">暂无分配数据</p>
                    <p className="text-xs text-muted-foreground max-w-xs">请先在分配工作台执行智能分配或手动分配后，再查看甘特图</p>
                    <button className="btn-primary" onClick={() => navigate('/allocation')}>
                        前往分配工作台
                    </button>
                </div>
            ) : (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{delay: 0.1}}
                    className="space-y-5"
                >
                    {/* Chart */}
                    <div className="card p-5 overflow-hidden">
                        <GanttChart
                            allocations={allocations}
                            requirements={requirements}
                            members={members}
                            weekLabel={weekLabel}
                        />
                    </div>

                    {/* Legend */}
                    <div className="card py-4">
                        <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">需求图例</p>
                        <div className="flex flex-wrap gap-3">
                            {requirements.map(req => {
                                // Check if this req has any allocation
                                const allocated = allocations.filter(a => a.requirementId === req.id).reduce((s, a) => s + a.allocatedDays, 0);
                                return (
                                    <div key={req.id} className="flex items-center gap-2">
                                        <span
                                            className="w-3 h-3 rounded-sm shrink-0"
                                            style={{backgroundColor: req.color || '#6366f1'}}
                                        />
                                        <span className="text-xs text-foreground">{req.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            ({allocated}/{req.mandays}天)
                                        </span>
                                        {allocated < req.mandays && (
                                            <span className="badge bg-accent-100 text-accent-700 text-xs">待分配</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary table */}
                    <div className="card p-0 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border">
                            <p className="text-sm font-semibold text-foreground">成员分配汇总</p>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-secondary-50">
                                    <th className="text-left px-5 py-3 text-xs font-medium text-secondary-600">成员</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-secondary-600">角色</th>
                                    <th className="text-center px-3 py-3 text-xs font-medium text-secondary-600">可用人天</th>
                                    <th className="text-center px-3 py-3 text-xs font-medium text-secondary-600">已分配</th>
                                    <th className="text-center px-3 py-3 text-xs font-medium text-secondary-600">剩余</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-secondary-600">承接需求</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m, i) => {
                                    const memberAllocs = allocations.filter(a => a.memberId === m.id);
                                    const totalAllocated = memberAllocs.reduce((s, a) => s + a.allocatedDays, 0);
                                    const remaining = m.availableDays - totalAllocated;
                                    const reqNames = memberAllocs
                                        .map(a => requirements.find(r => r.id === a.requirementId)?.name)
                                        .filter(Boolean);

                                    return (
                                        <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-secondary-50/40'}>
                                            <td className="px-5 py-3 font-medium text-foreground text-sm">{m.name}</td>
                                            <td className="px-3 py-3 text-xs text-muted-foreground">{m.role || '—'}</td>
                                            <td className="px-3 py-3 text-center text-xs">{m.availableDays}</td>
                                            <td className="px-3 py-3 text-center text-xs font-semibold text-primary-600">{totalAllocated}</td>
                                            <td className={`px-3 py-3 text-center text-xs font-semibold ${remaining < 0 ? 'text-red-500' : remaining === 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                {remaining}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {reqNames.length === 0
                                                        ? <span className="text-xs text-muted-foreground italic">未分配</span>
                                                        : reqNames.map((n, j) => (
                                                            <span key={j} className="badge bg-primary-50 text-primary-700 text-xs">{n}</span>
                                                        ))
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
