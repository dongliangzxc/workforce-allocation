/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} name
 * @property {string} [role]
 * @property {number} availableDays  - 下周可用人天 0~5
 * @property {string[]} skills       - 技能/属性标签
 */

/**
 * @typedef {Object} Requirement
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} mandays        - 所需人天
 * @property {string[]} requiredSkills
 * @property {number} priority       - 优先级，浮点数，值越小越高（如 1.0 优于 2.0）
 * @property {boolean} mustThisWeek  - 是否必须本周完成，false 表示可跨周持续推进，默认 true
 * @property {string} [color]        - 甘特图颜色，自动分配
 */

/**
 * @typedef {Object} AllocationItem
 * @property {string} id
 * @property {string} requirementId
 * @property {string} memberId
 * @property {number} allocatedDays
 * @property {string} [reason]       - LLM 分配理由
 */

/**
 * @typedef {Object} LLMConfig
 * @property {string} baseURL  - 如 "https://api.openai.com/v1"
 * @property {string} apiKey   - 如 "sk-..."
 * @property {string} model    - 如 "gpt-4o"
 */

/**
 * @typedef {Object} AppData
 * @property {Member[]} members
 * @property {Requirement[]} requirements
 * @property {AllocationItem[]} allocations
 * @property {string} weekLabel
 * @property {string} [llmSummary]   - 最近一次 LLM 分配思路说明
 */

export const PRESET_SKILLS = ['前端', '后端', '测试', '设计', 'iOS', 'Android', '数据', '产品', '运维'];

export const SKILL_COLORS = {
    '前端':    'bg-blue-100 text-blue-700',
    '后端':    'bg-green-100 text-green-700',
    '测试':    'bg-orange-100 text-orange-700',
    '设计':    'bg-pink-100 text-pink-700',
    'iOS':     'bg-slate-100 text-slate-700',
    'Android': 'bg-emerald-100 text-emerald-700',
    '数据':    'bg-cyan-100 text-cyan-700',
    '产品':    'bg-accent-100 text-accent-700',
    '运维':    'bg-red-100 text-red-700',
};

export const GANTT_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444',
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
    '#84cc16', '#06b6d4', '#a855f7', '#64748b',
];

export function getDefaultSkillColor(skill) {
    return SKILL_COLORS[skill] || 'bg-secondary-100 text-secondary-700';
}
