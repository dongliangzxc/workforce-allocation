import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { LayoutDashboard, Users, ClipboardList, Kanban, GanttChartSquare, Settings, Archive, CheckCircle } from 'lucide-react';
import { cn } from '@utils/cn.js';
import { useAppStore } from '../store/useAppStore.js';
import ArchiveModal from './ArchiveModal.jsx';

const NAV_ITEMS = [
    {path: '/',             icon: LayoutDashboard,  label: '总览'},
    {path: '/members',      icon: Users,            label: '成员'},
    {path: '/requirements', icon: ClipboardList,    label: '需求'},
    {path: '/allocation',   icon: Kanban,           label: '分配'},
    {path: '/gantt',        icon: GanttChartSquare, label: '甘特图'},
    {path: '/history',      icon: Archive,          label: '历史记录'},
    {path: '/settings',     icon: Settings,         label: '设置'},
];

export default function Layout() {
    const location = useLocation();
    const { weekLabel, archiveCurrentWeek } = useAppStore();
    const [archiveOpen, setArchiveOpen]   = useState(false);
    const [archivedTip, setArchivedTip]   = useState(false);

    const handleArchive = (name) => {
        archiveCurrentWeek(name);
        setArchivedTip(true);
    };

    useEffect(() => {
        if (!archivedTip) return;
        const t = setTimeout(() => setArchivedTip(false), 2500);
        return () => clearTimeout(t);
    }, [archivedTip]);

    return (
        <div className="flex min-h-screen bg-secondary-50">
            {/* ── Sidebar ── */}
            <aside className="w-56 bg-white border-r border-border flex flex-col shadow-sm shrink-0">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <GanttChartSquare size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground leading-tight">人力分配</p>
                            <p className="text-xs text-muted-foreground leading-tight">WorkForce Tool</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map(({path, icon: Icon, label}) => {
                        const isActive = path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(path);
                        return (
                            <NavLink
                                key={path}
                                to={path}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                                    isActive
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-800',
                                )}
                            >
                                <Icon size={17} className={isActive ? 'text-primary-600' : ''} />
                                {label}
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">数据存于本地浏览器</p>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Top header bar */}
                <header className="sticky top-0 z-10 bg-white border-b border-border px-6 py-2.5 flex items-center justify-between shrink-0">
                    <span className="text-sm font-medium text-secondary-600">
                        当前周期：<span className="text-foreground">{weekLabel}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        {archivedTip && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg ring-1 ring-emerald-200">
                                <CheckCircle size={12} />已归档
                            </span>
                        )}
                        <button
                            className="btn-secondary text-xs py-1.5 px-3"
                            onClick={() => setArchiveOpen(true)}
                        >
                            <Archive size={13} />归档本周
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>

            {/* Archive modal */}
            <ArchiveModal
                open={archiveOpen}
                onClose={() => setArchiveOpen(false)}
                onConfirm={handleArchive}
                defaultName={weekLabel}
            />
        </div>
    );
}
