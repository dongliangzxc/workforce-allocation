/**
 * 根据 weekLabel（如 "2026 第14周"）计算该周的周一日期
 * 若解析失败，默认返回下周一
 */
export function getNextMonday(weekLabel) {
    // 尝试从 weekLabel 解析年份和周数
    if (weekLabel) {
        const m = weekLabel.match(/(\d{4})\s*第\s*(\d+)\s*周/);
        if (m) {
            const year = parseInt(m[1], 10);
            const week = parseInt(m[2], 10);
            // ISO 8601: 第1周的周四在1月4日
            const jan4 = new Date(year, 0, 4);
            const jan4Day = jan4.getDay() || 7; // 1=Mon...7=Sun
            const monday = new Date(jan4);
            monday.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7);
            return monday;
        }
    }
    // 默认：下周一
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const daysUntilMonday = 8 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * 获取周一开始的5个工作日日期
 * @param {Date} monday
 * @returns {Date[]}
 */
export function getWorkDays(monday) {
    return Array.from({length: 5}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五'];

/**
 * 将 allocations + requirements + members 转换为甘特图展示数据
 * @param {import('../types/index.js').AllocationItem[]} allocations
 * @param {import('../types/index.js').Requirement[]} requirements
 * @param {import('../types/index.js').Member[]} members
 * @param {string} weekLabel
 * @returns {{ workDays: {date: Date, label: string}[], rows: GanttRow[] }}
 */
export function buildGanttData(allocations, requirements, members, weekLabel) {
    const monday = getNextMonday(weekLabel);
    const workDays = getWorkDays(monday).map((date, i) => ({
        date,
        label: DAY_NAMES[i],
        dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
    }));

    const rows = members.map((member) => {
        // 获取该成员所有分配，按需求优先级排序
        const memberAllocs = allocations
            .filter(a => a.memberId === member.id)
            .sort((a, b) => {
                const ra = requirements.find(r => r.id === a.requirementId);
                const rb = requirements.find(r => r.id === b.requirementId);
                return (ra?.priority ?? 99) - (rb?.priority ?? 99);
            });

        // 将天数顺序映射到工作日
        // 倒推：可用天数靠右对齐，windowStart = 5 - availableDays
        // 例：5天→周一起，3天→周三起，1天→周五起
        const windowStart = Math.max(0, Math.floor(5 - member.availableDays));
        let currentDayIndex = windowStart;
        const bars = memberAllocs
            .filter(a => a.allocatedDays > 0)
            .map((alloc) => {
                const req = requirements.find(r => r.id === alloc.requirementId);
                const startIdx = currentDayIndex;
                const endIdx = Math.min(currentDayIndex + alloc.allocatedDays - 1, 4);
                currentDayIndex += alloc.allocatedDays;

                return {
                    requirementId: alloc.requirementId,
                    requirementName: req?.name ?? '未知需求',
                    description: req?.description ?? '',
                    allocatedDays: alloc.allocatedDays,
                    reason: alloc.reason ?? '',
                    color: req?.color ?? '#94a3b8',
                    mustThisWeek: req?.mustThisWeek !== false, // 默认 true
                    startDayIndex: startIdx,
                    endDayIndex: endIdx,
                    overflow: currentDayIndex > 5,
                };
            });

        return {
            memberId: member.id,
            memberName: member.name,
            role: member.role ?? '',
            availableDays: member.availableDays,
            allocatedTotal: memberAllocs.reduce((s, a) => s + a.allocatedDays, 0),
            bars,
        };
    });

    return {workDays, rows};
}
