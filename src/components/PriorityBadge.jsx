import { cn } from '@utils/cn.js';

/**
 * 将浮点优先级映射为颜色徽章
 * 规则：值 ≤ 1 → 红色（紧急），1 < 值 ≤ 3 → 黄色（中），> 3 → 绿色（低）
 *
 * @param {{ value: number, className?: string, showLabel?: boolean }} props
 */
export default function PriorityBadge({value, className, showLabel = true}) {
    const num = Number(value);
    const {color, label} =
        num <= 1   ? {color: 'bg-red-100 text-red-700 ring-1 ring-red-200',    label: '紧急'} :
        num <= 3   ? {color: 'bg-accent-100 text-accent-700 ring-1 ring-accent-200', label: '重要'} :
                     {color: 'bg-green-100 text-green-700 ring-1 ring-green-200', label: '普通'};

    return (
        <span className={cn('badge items-center gap-1', color, className)}>
            <span className="font-semibold tabular-nums">{isNaN(num) ? '?' : num}</span>
            {showLabel && <span className="opacity-75">{label}</span>}
        </span>
    );
}
