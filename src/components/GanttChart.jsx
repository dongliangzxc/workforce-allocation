import { useState, useRef, useCallback } from 'react';
import { buildGanttData } from '../utils/gantt.js';
import { cn } from '@utils/cn.js';

const ROW_H = 52;
const HEADER_H = 48;
const LABEL_W = 140;
const COL_GAP = 2;

/**
 * SVG 甘特图
 * @param {{
 *   allocations: import('../types/index.js').AllocationItem[],
 *   requirements: import('../types/index.js').Requirement[],
 *   members: import('../types/index.js').Member[],
 *   weekLabel: string,
 * }} props
 */
export default function GanttChart({allocations, requirements, members, weekLabel}) {
    const [tooltip, setTooltip] = useState(null); // { x, y, content }
    const svgRef = useRef(null);

    const {workDays, rows} = buildGanttData(allocations, requirements, members, weekLabel);

    // 动态宽度：整个容器填满，每列等宽
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(800);

    const measuredRef = useCallback(node => {
        if (node) {
            const ro = new ResizeObserver(entries => {
                setContainerWidth(entries[0].contentRect.width);
            });
            ro.observe(node);
        }
    }, []);

    const colW = Math.max(60, (containerWidth - LABEL_W) / 5);
    const totalW = LABEL_W + colW * 5;
    const totalH = HEADER_H + rows.length * ROW_H + 8;

    const showTooltip = (e, content) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top - 10,
            content,
        });
    };
    const hideTooltip = () => setTooltip(null);

    if (members.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                暂无成员数据
            </div>
        );
    }

    return (
        <div ref={measuredRef} className="relative w-full overflow-x-auto">
            <svg
                ref={svgRef}
                width={totalW}
                height={totalH}
                className="font-sans"
            >
                {/* ── Background ── */}
                <rect width={totalW} height={totalH} fill="#f8fafc" rx={12} />

                {/* ── Header ── */}
                <rect x={0} y={0} width={totalW} height={HEADER_H} fill="#f1f5f9" rx={12} />
                <rect x={0} y={HEADER_H - 8} width={totalW} height={8} fill="#f1f5f9" />

                {/* 左上角标题 */}
                <text x={16} y={HEADER_H / 2 + 5} fontSize={12} fill="#64748b" fontWeight="600">
                    成员 / 工作日
                </text>

                {/* Day headers */}
                {workDays.map((day, i) => {
                    const x = LABEL_W + i * colW;
                    return (
                        <g key={i}>
                            <rect x={x + COL_GAP} y={6} width={colW - COL_GAP * 2} height={HEADER_H - 12} fill="#e0e7ff" rx={6} />
                            <text x={x + colW / 2} y={HEADER_H / 2 - 4} textAnchor="middle" fontSize={12} fontWeight="600" fill="#4338ca">
                                {day.label}
                            </text>
                            <text x={x + colW / 2} y={HEADER_H / 2 + 10} textAnchor="middle" fontSize={10} fill="#6366f1">
                                {day.dateStr}
                            </text>
                        </g>
                    );
                })}

                {/* ── Rows ── */}
                {rows.map((row, ri) => {
                    const rowY = HEADER_H + ri * ROW_H;
                    const isEven = ri % 2 === 0;

                    return (
                        <g key={row.memberId}>
                            {/* Row background */}
                            <rect
                                x={0} y={rowY}
                                width={totalW} height={ROW_H}
                                fill={isEven ? '#ffffff' : '#f8fafc'}
                            />

                            {/* Member label */}
                            <text x={12} y={rowY + ROW_H / 2 - 5} fontSize={12} fontWeight="600" fill="#1e293b">
                                {row.memberName}
                            </text>
                            <text x={12} y={rowY + ROW_H / 2 + 10} fontSize={10} fill="#94a3b8">
                                {row.role || ''} · {row.allocatedTotal}/{row.availableDays}天
                            </text>

                            {/* Day grid */}
                            {workDays.map((_, i) => (
                                <rect
                                    key={i}
                                    x={LABEL_W + i * colW + COL_GAP}
                                    y={rowY + 4}
                                    width={colW - COL_GAP * 2}
                                    height={ROW_H - 8}
                                    fill="none"
                                    stroke="#e2e8f0"
                                    strokeWidth={1}
                                    rx={4}
                                />
                            ))}

                            {/* Allocation bars */}
                            {row.bars.map((bar, bi) => {
                                const startX = LABEL_W + bar.startDayIndex * colW + COL_GAP + 2;
                                const barW = Math.min(bar.allocatedDays, 5 - bar.startDayIndex) * colW - COL_GAP * 2 - 4;
                                if (barW <= 0) return null;
                                const barY = rowY + 8;
                                const barH = ROW_H - 16;

                                return (
                                    <g
                                        key={bi}
                                        style={{cursor: 'pointer'}}
                                        onMouseMove={(e) => showTooltip(e, {
                                            name: bar.requirementName,
                                            days: bar.allocatedDays,
                                            reason: bar.reason,
                                            desc: bar.description,
                                            mustThisWeek: bar.mustThisWeek,
                                        })}
                                        onMouseLeave={hideTooltip}
                                    >
                                        {/* 主体 Bar */}
                                        <rect
                                            x={startX} y={barY}
                                            width={barW} height={barH}
                                            fill={bar.color}
                                            rx={5}
                                            opacity={bar.mustThisWeek ? 0.9 : 0.55}
                                        />
                                        {/* 可跨周：虚线边框 */}
                                        {!bar.mustThisWeek && (
                                            <rect
                                                x={startX} y={barY}
                                                width={barW} height={barH}
                                                fill="none"
                                                stroke={bar.color}
                                                strokeWidth={1.5}
                                                strokeDasharray="4 2"
                                                rx={5}
                                            />
                                        )}
                                        {/* Bar 文字 */}
                                        {barW > 40 && (
                                            <text
                                                x={startX + barW / 2}
                                                y={barY + barH / 2 + 4}
                                                textAnchor="middle"
                                                fontSize={10}
                                                fontWeight="600"
                                                fill="#fff"
                                                style={{pointerEvents: 'none'}}
                                            >
                                                {bar.requirementName.length > 6
                                                    ? bar.requirementName.slice(0, 5) + '…'
                                                    : bar.requirementName}
                                            </text>
                                        )}
                                        {/* 可跨周溢出箭头 → */}
                                        {bar.overflow && !bar.mustThisWeek && (
                                            <text
                                                x={LABEL_W + 5 * colW - 8}
                                                y={barY + barH / 2 + 4}
                                                fontSize={12}
                                                fontWeight="700"
                                                fill={bar.color}
                                                style={{pointerEvents: 'none'}}
                                            >
                                                →
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Row separator */}
                            <line x1={0} y1={rowY + ROW_H} x2={totalW} y2={rowY + ROW_H} stroke="#e2e8f0" strokeWidth={1} />
                        </g>
                    );
                })}

                {/* Left border */}
                <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={totalH} stroke="#e2e8f0" strokeWidth={1} />
            </svg>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="absolute z-10 bg-secondary-800 text-white text-xs rounded-lg px-3 py-2.5 shadow-xl max-w-56 pointer-events-none"
                    style={{left: tooltip.x, top: tooltip.y}}
                >
                    <p className="font-semibold mb-1">{tooltip.content.name}</p>
                    {tooltip.content.mustThisWeek === false && (
                        <p className="text-secondary-400 text-xs mb-1">↻ 可跨周推进</p>
                    )}
                    <p className="text-secondary-300">分配 {tooltip.content.days} 人天</p>
                    {tooltip.content.reason && (
                        <p className="text-secondary-300 mt-1 leading-relaxed">{tooltip.content.reason}</p>
                    )}
                    {tooltip.content.desc && (
                        <p className="text-secondary-400 mt-1 border-t border-secondary-600 pt-1">{tooltip.content.desc}</p>
                    )}
                </div>
            )}
        </div>
    );
}
