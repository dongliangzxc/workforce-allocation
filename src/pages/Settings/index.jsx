import { useState, useRef } from 'react';
import { Settings as SettingsIcon, Wifi, WifiOff, CheckCircle, AlertCircle, Eye, EyeOff, Download, Upload, Database, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore.js';
import { testLLMConnection } from '../../utils/llm.js';
import Modal from '../../components/Modal.jsx';

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'qwen-plus', 'qwen-max', 'deepseek-chat'];

export default function Settings() {
    const { llmConfig, setLLMConfig, members, requirements, allocations, weekLabel, llmSummary, importData } = useAppStore();
    const [form, setForm] = useState({...llmConfig});
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'
    const [testMsg, setTestMsg] = useState('');
    const [saved, setSaved] = useState(false);

    // Data backup state
    const fileInputRef = useRef(null);
    const [importPreview, setImportPreview] = useState(null); // parsed JSON waiting for confirm
    const [importError, setImportError] = useState('');

    const set = (k, v) => { setForm(f => ({...f, [k]: v})); setTestResult(null); setSaved(false); };

    const handleSave = () => {
        setLLMConfig(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleTest = async () => {
        if (!form.baseURL || !form.apiKey) {
            setTestResult('error');
            setTestMsg('请先填写 Base URL 和 API Key');
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            await testLLMConnection(form);
            setTestResult('ok');
            setTestMsg('连接成功！LLM 服务正常');
        } catch (e) {
            setTestResult('error');
            setTestMsg(e.message || '连接失败，请检查配置');
        } finally {
            setTesting(false);
        }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = () => {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            weekLabel,
            members,
            requirements,
            allocations,
            llmSummary,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wft-backup-${weekLabel.replace(/\s/g, '')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Import ────────────────────────────────────────────────────────────────
    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setImportError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!Array.isArray(parsed.members) || !Array.isArray(parsed.requirements)) {
                    setImportError('文件格式不正确，缺少 members 或 requirements 字段');
                    return;
                }
                setImportPreview(parsed);
            } catch {
                setImportError('JSON 解析失败，请确认文件来自本工具导出');
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        if (!importPreview) return;
        importData(importPreview);
        setImportPreview(null);
    };

    const isConfigured = form.baseURL && form.apiKey;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <motion.div
                initial={{opacity: 0, y: -8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4}}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                        <SettingsIcon size={20} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">设置</h1>
                        <p className="text-sm text-muted-foreground">数据备份 · AI 增强配置</p>
                    </div>
                </div>

                {/* ── Data Backup Section ───────────────────────────────────────────── */}
                <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                        <Database size={16} className="text-secondary-500" />
                        <h2 className="text-sm font-semibold text-foreground">数据备份</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        将当前成员、需求和分配数据导出为 JSON 文件，可用于备份或在其他设备上恢复。
                    </p>
                    <div className="flex gap-3">
                        <button className="btn-secondary flex-1" onClick={handleExport}>
                            <Download size={14} />导出数据
                        </button>
                        <button className="btn-secondary flex-1" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={14} />导入备份
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportFile}
                        />
                    </div>
                    {importError && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg ring-1 ring-red-200">
                            <AlertCircle size={13} />
                            {importError}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        当前数据：{members.length} 个成员 · {requirements.length} 个需求 · {allocations.length} 条分配
                    </p>
                </div>

                {/* ── LLM Section ─────────────────────────────────────────────────── */}
                <div className="card space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-primary-500" />
                            <h2 className="text-sm font-semibold text-foreground">AI 增强</h2>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 font-medium">
                            可选
                        </span>
                    </div>

                    {/* Feature capability table */}
                    <div className="rounded-lg overflow-hidden border border-border text-xs">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-secondary-50">
                                    <th className="text-left px-3 py-2 font-medium text-secondary-600">功能</th>
                                    <th className="text-center px-3 py-2 font-medium text-secondary-600">无需 AI</th>
                                    <th className="text-center px-3 py-2 font-medium text-secondary-600">需要 AI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {[
                                    ['成员 / 需求手动录入', true, false],
                                    ['规则自动分配', true, false],
                                    ['历史存档与查看', true, false],
                                    ['截图快速录入', false, true],
                                    ['AI 智能分配', false, true],
                                ].map(([name, noAI, withAI]) => (
                                    <tr key={name} className="bg-white">
                                        <td className="px-3 py-2 text-foreground">{name}</td>
                                        <td className="px-3 py-2 text-center">{noAI ? '✓' : ''}</td>
                                        <td className="px-3 py-2 text-center">{withAI ? '✓' : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Status banner */}
                    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium ${
                        isConfigured
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-secondary-50 text-secondary-600 ring-1 ring-secondary-200'
                    }`}>
                        {isConfigured ? <Wifi size={16} /> : <WifiOff size={16} />}
                        {isConfigured ? 'AI 已配置，截图导入和智能分配可用' : '当前使用规则模式，配置 AI 可解锁更多功能'}
                    </div>

                    <div>
                        <label className="label">Base URL</label>
                        <input
                            className="input"
                            placeholder="https://api.openai.com/v1"
                            value={form.baseURL}
                            onChange={e => set('baseURL', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">兼容 OpenAI Chat Completions 格式的任意服务，如 Azure、Ollama 等</p>
                    </div>

                    <div>
                        <label className="label">API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                className="input pr-10"
                                placeholder="sk-..."
                                value={form.apiKey}
                                onChange={e => set('apiKey', e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">API Key 仅保存在本地浏览器中，不会上传至任何服务器</p>
                    </div>

                    <div>
                        <label className="label">模型</label>
                        <div className="flex gap-2">
                            <input
                                className="input flex-1"
                                placeholder="gpt-4o"
                                value={form.model}
                                onChange={e => set('model', e.target.value)}
                                list="model-list"
                            />
                            <datalist id="model-list">
                                {MODELS.map(m => <option key={m} value={m} />)}
                            </datalist>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {MODELS.map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => set('model', m)}
                                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                                        form.model === m
                                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                                            : 'bg-white border-border text-muted-foreground hover:border-primary-200'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm ${
                            testResult === 'ok'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-600'
                        }`}>
                            {testResult === 'ok'
                                ? <CheckCircle size={15} className="mt-0.5 shrink-0" />
                                : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
                            <span>{testMsg}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            className="btn-secondary flex-1"
                            onClick={handleTest}
                            disabled={testing}
                        >
                            {testing
                                ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-secondary-400 border-t-transparent rounded-full animate-spin" />测试中…</span>
                                : <><Wifi size={14} />测试连接</>
                            }
                        </button>
                        <button
                            className="btn-primary flex-1"
                            onClick={handleSave}
                        >
                            {saved ? <><CheckCircle size={14} />已保存</> : '保存配置'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Import Confirm Modal */}
            <Modal
                open={!!importPreview}
                onClose={() => setImportPreview(null)}
                title="确认导入备份"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setImportPreview(null)}>取消</button>
                        <button className="btn-primary" onClick={handleConfirmImport}>确认导入</button>
                    </>
                }
            >
                {importPreview && (
                    <div className="space-y-3 text-sm">
                        <p className="text-secondary-600">将导入以下数据，<span className="font-semibold text-red-600">当前数据将被覆盖</span>：</p>
                        <div className="bg-secondary-50 rounded-lg px-4 py-3 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-secondary-500">周次</span>
                                <span className="font-medium">{importPreview.weekLabel || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-500">成员</span>
                                <span className="font-medium">{importPreview.members?.length ?? 0} 人</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-500">需求</span>
                                <span className="font-medium">{importPreview.requirements?.length ?? 0} 条</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-500">分配记录</span>
                                <span className="font-medium">{importPreview.allocations?.length ?? 0} 条</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
