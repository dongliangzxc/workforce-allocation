import { useState } from 'react';
import { Settings as SettingsIcon, Wifi, WifiOff, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore.js';
import { testLLMConnection } from '../../utils/llm.js';

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'qwen-plus', 'qwen-max', 'deepseek-chat'];

export default function Settings() {
    const { llmConfig, setLLMConfig } = useAppStore();
    const [form, setForm] = useState({...llmConfig});
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'
    const [testMsg, setTestMsg] = useState('');
    const [saved, setSaved] = useState(false);

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

    const isConfigured = form.baseURL && form.apiKey;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <motion.div
                initial={{opacity: 0, y: -8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4}}
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                        <SettingsIcon size={20} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">设置</h1>
                        <p className="text-sm text-muted-foreground">配置 LLM 服务以启用智能分配</p>
                    </div>
                </div>

                {/* Status banner */}
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl mb-6 text-sm font-medium ${
                    isConfigured
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-accent-50 text-accent-700 ring-1 ring-accent-200'
                }`}>
                    {isConfigured ? <Wifi size={16} /> : <WifiOff size={16} />}
                    {isConfigured ? 'LLM 已配置，智能分配功能可用' : '未配置 LLM，分配将使用规则兜底模式'}
                </div>

                {/* Form */}
                <div className="card space-y-5">
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

                {/* Tip */}
                <div className="mt-4 p-4 bg-secondary-50 rounded-xl border border-border">
                    <p className="text-xs font-semibold text-secondary-600 mb-1.5">使用说明</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>未配置时，分配页面将使用规则兜底（按优先级 + 技能匹配）</li>
                        <li>LLM 分配会综合考虑优先级、技能匹配度和工作量均衡</li>
                        <li>分配结果为建议值，可在分配页面手动调整</li>
                    </ul>
                </div>
            </motion.div>
        </div>
    );
}
