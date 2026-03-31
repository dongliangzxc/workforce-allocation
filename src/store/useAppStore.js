import { create } from 'zustand';
import { GANTT_COLORS } from '../types/index.js';

const STORAGE_KEY    = 'wft_data';
const LLM_CONFIG_KEY = 'wft_llm_config';
const HISTORY_KEY    = 'wft_history';
const HISTORY_LIMIT  = 50;

function getWeekNumber(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function defaultWeekLabel() {
    const today = new Date();
    // 指向下一周
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return `${nextWeek.getFullYear()} 第${getWeekNumber(nextWeek)}周`;
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function loadLLMConfig() {
    try {
        const raw = localStorage.getItem(LLM_CONFIG_KEY);
        return raw ? JSON.parse(raw) : {baseURL: '', apiKey: '', model: ''};
    } catch {
        return {baseURL: '', apiKey: '', model: ''};
    }
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function persistHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('历史归档写入失败（存储空间不足）', e);
    }
}

function persist(patch, state) {
    const next = {
        members:      patch.members      ?? state.members,
        requirements: patch.requirements ?? state.requirements,
        allocations:  patch.allocations  ?? state.allocations,
        weekLabel:    patch.weekLabel    ?? state.weekLabel,
        llmSummary:   patch.llmSummary   ?? state.llmSummary,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

const defaultState = {
    members:      [],
    requirements: [],
    allocations:  [],
    weekLabel:    defaultWeekLabel(),
    llmSummary:   '',
};

const saved = loadData();

export const useAppStore = create((set, get) => ({
    ...(saved || defaultState),
    llmConfig: loadLLMConfig(),
    history:   loadHistory(),

    // ─── Week Label ───────────────────────────────────────────────────────────
    setWeekLabel: (label) => set((state) => {
        const patch = {weekLabel: label};
        persist(patch, state);
        return patch;
    }),

    // ─── LLM Config ──────────────────────────────────────────────────────────
    setLLMConfig: (config) => set(() => {
        localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
        return {llmConfig: config};
    }),

    // ─── Members ─────────────────────────────────────────────────────────────
    addMember: (member) => set((state) => {
        const patch = {members: [...state.members, {...member, id: crypto.randomUUID()}]};
        persist(patch, state);
        return patch;
    }),
    updateMember: (id, data) => set((state) => {
        const patch = {members: state.members.map(m => m.id === id ? {...m, ...data} : m)};
        persist(patch, state);
        return patch;
    }),
    deleteMember: (id) => set((state) => {
        const patch = {
            members: state.members.filter(m => m.id !== id),
            allocations: state.allocations.filter(a => a.memberId !== id),
        };
        persist(patch, state);
        return patch;
    }),

    // ─── Requirements ────────────────────────────────────────────────────────
    addRequirement: (req) => set((state) => {
        const colorIndex = state.requirements.length % GANTT_COLORS.length;
        const patch = {
            requirements: [
                ...state.requirements,
                {...req, id: crypto.randomUUID(), color: GANTT_COLORS[colorIndex]},
            ],
        };
        persist(patch, state);
        return patch;
    }),
    updateRequirement: (id, data) => set((state) => {
        const patch = {requirements: state.requirements.map(r => r.id === id ? {...r, ...data} : r)};
        persist(patch, state);
        return patch;
    }),
    deleteRequirement: (id) => set((state) => {
        const patch = {
            requirements: state.requirements.filter(r => r.id !== id),
            allocations:  state.allocations.filter(a => a.requirementId !== id),
        };
        persist(patch, state);
        return patch;
    }),

    // ─── Allocations ─────────────────────────────────────────────────────────
    setAllocations: (allocations, summary = '') => set((state) => {
        const patch = {allocations, llmSummary: summary};
        persist(patch, state);
        return patch;
    }),
    updateAllocation: (requirementId, memberId, allocatedDays, reason = '') => set((state) => {
        const existing = state.allocations.find(
            a => a.requirementId === requirementId && a.memberId === memberId,
        );
        let newAllocations;
        if (allocatedDays <= 0) {
            newAllocations = state.allocations.filter(
                a => !(a.requirementId === requirementId && a.memberId === memberId),
            );
        } else if (existing) {
            newAllocations = state.allocations.map(a =>
                a.requirementId === requirementId && a.memberId === memberId
                    ? {...a, allocatedDays, reason}
                    : a,
            );
        } else {
            newAllocations = [
                ...state.allocations,
                {id: crypto.randomUUID(), requirementId, memberId, allocatedDays, reason},
            ];
        }
        const patch = {allocations: newAllocations};
        persist(patch, state);
        return patch;
    }),
    clearAllocations: () => set((state) => {
        const patch = {allocations: [], llmSummary: ''};
        persist(patch, state);
        return patch;
    }),

    // ─── History ─────────────────────────────────────────────────────────────
    archiveCurrentWeek: (name) => {
        const state = get();
        const entry = {
            id:           crypto.randomUUID(),
            name:         name || state.weekLabel,
            savedAt:      new Date().toISOString(),
            weekLabel:    state.weekLabel,
            members:      state.members,
            requirements: state.requirements,
            allocations:  state.allocations,
            llmSummary:   state.llmSummary,
        };
        const next = [entry, ...state.history].slice(0, HISTORY_LIMIT);
        persistHistory(next);
        set({history: next});
    },
    deleteHistoryEntry: (id) => {
        const next = get().history.filter(e => e.id !== id);
        persistHistory(next);
        set({history: next});
    },
}));
