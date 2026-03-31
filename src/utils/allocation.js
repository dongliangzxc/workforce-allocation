import { callLLM } from './llm.js';

/**
 * 构造分配 Prompt
 */
function buildPrompt(requirements, members) {
    const memberList = members.map(m =>
        `- ID:"${m.id}" 姓名:${m.name}（${m.role || '未指定角色'}）` +
        ` 可用人天:${m.availableDays} 技能:[${m.skills.join('、') || '无'}]`,
    ).join('\n');

    const reqList = [...requirements]
        .sort((a, b) => a.priority - b.priority)
        .map(r =>
            `- ID:"${r.id}" [优先级${r.priority}] 名称:${r.name}` +
            ` 描述:${r.description || '无'} 需要人天:${r.mandays}` +
            ` 所需技能:[${r.requiredSkills.join('、') || '无'}]` +
            (r.mustThisWeek === false ? ' 【可跨周推进，无需本周完成】' : ' 【必须本周完成】'),
        ).join('\n');

    return `你是一个专业的项目管理助手，请根据以下团队成员信息和需求列表，给出合理的人力分配方案。

【团队成员】
${memberList}

【需求列表】（优先级数值越小越紧急，请优先保障优先级高的需求）
${reqList}

请综合考虑：优先级、技能匹配度、工作量均衡，以最优化的方式分配人力。
注意事项：
1. 每位成员的分配总天数不能超过其可用人天
2. 一个需求可以拆分给多人，一个人也可以承接多个需求
3. 技能不匹配时可降级分配，但应优先技能匹配的成员
4. 如果总可用人天不足以覆盖所有需求，优先满足优先级高的需求

请仅输出如下 JSON 格式，不要输出其他任何内容：
{
  "allocations": [
    { "requirementId": "...", "memberId": "...", "allocatedDays": 数字, "reason": "分配理由（简洁说明匹配原因）" }
  ],
  "summary": "整体分配思路说明（2-3句话）"
}`;
}

/**
 * 规则兜底分配（LLM 不可用时）
 * @param {import('../types/index.js').Requirement[]} requirements
 * @param {import('../types/index.js').Member[]} members
 * @returns {{ allocations: import('../types/index.js').AllocationItem[], summary: string }}
 */
function fallbackAllocate(requirements, members) {
    const sorted = [...requirements].sort((a, b) => a.priority - b.priority);
    const remaining = Object.fromEntries(members.map(m => [m.id, m.availableDays]));
    const allocations = [];

    for (const req of sorted) {
        let leftDays = req.mandays;

        // 先按技能匹配度排序成员（交集越多越靠前）
        const ranked = [...members].sort((a, b) => {
            const scoreA = req.requiredSkills.filter(s => a.skills.includes(s)).length;
            const scoreB = req.requiredSkills.filter(s => b.skills.includes(s)).length;
            return scoreB - scoreA;
        });

        for (const member of ranked) {
            if (leftDays <= 0) break;
            const avail = remaining[member.id] || 0;
            if (avail <= 0) continue;

            const days = Math.min(leftDays, avail);
            remaining[member.id] -= days;
            leftDays -= days;

            const skillMatch = req.requiredSkills.filter(s => member.skills.includes(s));
            allocations.push({
                id: crypto.randomUUID(),
                requirementId: req.id,
                memberId: member.id,
                allocatedDays: days,
                reason: skillMatch.length > 0
                    ? `技能匹配（${skillMatch.join('、')}），分配 ${days} 人天`
                    : `兜底分配（无技能匹配），分配 ${days} 人天`,
            });
        }
    }

    return {
        allocations,
        summary: '⚠️ 使用规则兜底分配（LLM 未配置或调用失败）：按优先级排序需求，优先分配技能匹配成员。',
    };
}

/**
 * 智能分配主函数
 * @param {import('../types/index.js').Requirement[]} requirements
 * @param {import('../types/index.js').Member[]} members
 * @param {{ baseURL: string, apiKey: string, model: string }} llmConfig
 * @returns {Promise<{ allocations: import('../types/index.js').AllocationItem[], summary: string }>}
 */
export async function autoAllocate(requirements, members, llmConfig) {
    if (!llmConfig?.baseURL || !llmConfig?.apiKey) {
        return fallbackAllocate(requirements, members);
    }

    try {
        const prompt = buildPrompt(requirements, members);
        const raw = await callLLM(prompt, llmConfig);

        // 提取 JSON（模型可能在前后附带说明文字）
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('LLM 未返回有效 JSON');

        const data = JSON.parse(match[0]);

        // 校验并修正分配天数不超过成员可用天数
        const remaining = Object.fromEntries(members.map(m => [m.id, m.availableDays]));
        const validated = [];
        for (const item of (data.allocations || [])) {
            const avail = remaining[item.memberId] ?? 0;
            const days = Math.min(Number(item.allocatedDays) || 0, avail);
            if (days > 0) {
                remaining[item.memberId] -= days;
                validated.push({
                    id: crypto.randomUUID(),
                    requirementId: item.requirementId,
                    memberId: item.memberId,
                    allocatedDays: days,
                    reason: item.reason || '',
                });
            }
        }

        return {allocations: validated, summary: data.summary || ''};
    } catch (e) {
        console.warn('LLM 分配失败，降级规则分配：', e.message);
        const result = fallbackAllocate(requirements, members);
        return {
            ...result,
            summary: `⚠️ LLM 调用失败（${e.message}），已自动降级为规则分配。`,
        };
    }
}
