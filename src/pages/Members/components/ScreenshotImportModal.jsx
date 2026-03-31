import { useState, useRef, useCallback } from 'react';
import { ImagePlus, UploadCloud, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Modal from '../../../components/Modal.jsx';
import { callLLMWithImage } from '../../../utils/llm.js';
import { cn } from '@utils/cn.js';

const MAX_SIZE_MB = 5;

const RECOGNITION_PROMPT = `这是一张团队排期/任务分配表截图。
请找出其中标注为"可以安排"（或含义相近：空闲、待安排、可用、available）的记录，
提取每个人的姓名和对应的可用天数（同一人多行"可以安排"天数相加合并）。

规则：
1. 只提取"可以安排"类型的行，忽略"已排非随"、"团队事务"、"申请休假"、"已完成"等
2. 同一人有多行"可以安排"时合并为一条，天数相加
3. 天数若为小时则除以8换算，结果保留一位小数
4. 最大天数不超过5

请只输出如下 JSON 数组，不要有任何其他内容：
[
  { "name": "张三", "availableDays": 3 },
  { "name": "李四", "availableDays": 1.5 }
]

若没有找到可安排的成员，返回空数组 []`;

/**
 * 从图片文件读取 base64 和 mimeType
 * @param {File} file
 * @returns {Promise<{ base64: string, mimeType: string, previewUrl: string }>}
 */
function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result; // "data:image/png;base64,xxxx"
            const [prefix, base64] = dataUrl.split(',');
            const mimeType = prefix.match(/data:([^;]+)/)?.[1] || 'image/png';
            resolve({base64, mimeType, previewUrl: dataUrl});
        };
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
    });
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   llmConfig: { baseURL: string, apiKey: string, model: string },
 *   existingMembers: { name: string }[],
 *   onImport: (items: { name: string, availableDays: number, isUpdate: boolean }[]) => void,
 * }} props
 */
export function ScreenshotImportModal({open, onClose, llmConfig, existingMembers, onImport}) {
    // 状态机：idle | recognizing | preview | error
    const [phase, setPhase] = useState('idle');
    const [imageInfo, setImageInfo] = useState(null);   // { base64, mimeType, previewUrl }
    const [rows, setRows] = useState([]);               // preview 行
    const [errorMsg, setErrorMsg] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // ── 重置到 idle ──────────────────────────────────────────────────────────
    const reset = () => {
        setPhase('idle');
        setImageInfo(null);
        setRows([]);
        setErrorMsg('');
    };

    const handleClose = () => { reset(); onClose(); };

    // ── 处理图片文件 ──────────────────────────────────────────────────────────
    const processFile = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            setErrorMsg('请上传图片文件（PNG/JPG/WebP）');
            setPhase('error');
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setErrorMsg(`图片过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请压缩至 ${MAX_SIZE_MB}MB 以内`);
            setPhase('error');
            return;
        }

        setPhase('recognizing');
        try {
            const info = await readImageFile(file);
            setImageInfo(info);

            const raw = await callLLMWithImage(info.base64, info.mimeType, RECOGNITION_PROMPT, llmConfig);

            // 从回复中提取 JSON
            const match = raw.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('模型未返回有效 JSON，请重试');

            const parsed = JSON.parse(match[0]);
            if (!Array.isArray(parsed)) throw new Error('返回格式错误');

            if (parsed.length === 0) {
                setErrorMsg('未识别到可安排的成员，请检查截图是否包含"可以安排"列');
                setPhase('error');
                return;
            }

            const existingNames = new Set(existingMembers.map(m => m.name));
            const deduped = parsed.reduce((acc, item) => {
                const existing = acc.find(r => r.name === item.name);
                if (existing) {
                    existing.availableDays = Math.min(5, +(existing.availableDays + item.availableDays).toFixed(1));
                } else {
                    acc.push({
                        id: crypto.randomUUID(),
                        name: item.name || '',
                        availableDays: Math.min(5, Math.max(0, +(Number(item.availableDays) || 0).toFixed(1))),
                        selected: true,
                        isUpdate: existingNames.has(item.name),
                    });
                }
                return acc;
            }, []);

            setRows(deduped);
            setPhase('preview');
        } catch (e) {
            setErrorMsg(e.message || '识别失败，请重试');
            setPhase('error');
        }
    }, [llmConfig, existingMembers]);

    // ── 拖拽事件 ─────────────────────────────────────────────────────────────
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    // ── 预览表格操作 ──────────────────────────────────────────────────────────
    const toggleRow = (id) => setRows(r => r.map(row => row.id === id ? {...row, selected: !row.selected} : row));
    const toggleAll = () => {
        const allSelected = rows.every(r => r.selected);
        setRows(r => r.map(row => ({...row, selected: !allSelected})));
    };
    const updateRow = (id, key, val) => setRows(r => r.map(row => row.id === id ? {...row, [key]: val} : row));

    const selectedCount = rows.filter(r => r.selected).length;

    // ── 导入 ─────────────────────────────────────────────────────────────────
    const handleImport = () => {
        const selected = rows
            .filter(r => r.selected && r.name.trim())
            .map(r => ({name: r.name.trim(), availableDays: Number(r.availableDays), isUpdate: r.isUpdate}));
        onImport(selected);
        handleClose();
    };

    // ── Footer 按钮 ───────────────────────────────────────────────────────────
    const renderFooter = () => {
        if (phase === 'preview') return (
            <>
                <button className="btn-secondary" onClick={reset}>
                    <RefreshCw size={14} />重新上传
                </button>
                <button className="btn-secondary" onClick={handleClose}>取消</button>
                <button className="btn-primary" disabled={selectedCount === 0} onClick={handleImport}>
                    <CheckCircle size={14} />导入选中（{selectedCount} 人）
                </button>
            </>
        );
        if (phase === 'error') return (
            <>
                <button className="btn-secondary" onClick={reset}>
                    <RefreshCw size={14} />重新上传
                </button>
                <button className="btn-secondary" onClick={handleClose}>关闭</button>
            </>
        );
        return null;
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="从截图导入成员工时"
            size="lg"
            footer={renderFooter()}
        >
            {/* ── idle：上传区 ── */}
            {phase === 'idle' && (
                <div
                    className={cn(
                        'flex flex-col items-center justify-center h-52 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                        isDragOver
                            ? 'border-primary-400 bg-primary-50'
                            : 'border-border hover:border-primary-300 hover:bg-secondary-50',
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <UploadCloud size={36} className={isDragOver ? 'text-primary-500' : 'text-muted-foreground'} />
                    <p className="mt-3 text-sm font-medium text-foreground">点击或拖拽上传排期截图</p>
                    <p className="mt-1 text-xs text-muted-foreground">支持 PNG / JPG / WebP，最大 5MB</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
                    />
                </div>
            )}

            {/* ── recognizing：识别中 ── */}
            {phase === 'recognizing' && (
                <div className="flex flex-col items-center gap-4 py-6">
                    {imageInfo && (
                        <img
                            src={imageInfo.previewUrl}
                            alt="截图预览"
                            className="max-h-40 max-w-full rounded-lg border border-border object-contain shadow-sm"
                        />
                    )}
                    <div className="flex items-center gap-2.5 text-primary-600">
                        <Loader size={18} className="animate-spin" />
                        <span className="text-sm font-medium">AI 识别中，请稍候…</span>
                    </div>
                    <p className="text-xs text-muted-foreground">正在分析截图中的排期信息</p>
                </div>
            )}

            {/* ── error ── */}
            {phase === 'error' && (
                <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle size={22} className="text-red-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground">识别失败</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">{errorMsg}</p>
                </div>
            )}

            {/* ── preview：预览表格 ── */}
            {phase === 'preview' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg ring-1 ring-emerald-200">
                            <CheckCircle size={14} />
                            识别到 {rows.length} 位成员，已选 {selectedCount} 位
                        </div>
                        <button
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            onClick={toggleAll}
                        >
                            {rows.every(r => r.selected) ? '取消全选' : '全选'}
                        </button>
                    </div>

                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-border">
                                    <th className="w-10 px-3 py-2.5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={rows.length > 0 && rows.every(r => r.selected)}
                                            onChange={toggleAll}
                                            className="accent-primary-500"
                                        />
                                    </th>
                                    <th className="text-left px-3 py-2.5 text-xs font-medium text-secondary-600">姓名</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-medium text-secondary-600">可用人天</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-medium text-secondary-600">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr
                                        key={row.id}
                                        className={cn(
                                            'border-b border-border last:border-0 transition-colors',
                                            row.selected ? 'bg-white' : 'bg-secondary-50 opacity-50',
                                            i % 2 === 1 && row.selected ? 'bg-secondary-50/40' : '',
                                        )}
                                    >
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.selected}
                                                onChange={() => toggleRow(row.id)}
                                                className="accent-primary-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={row.name}
                                                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                                className="w-full text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary-400 outline-none py-0.5 transition-colors"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                max="5"
                                                step="0.5"
                                                value={row.availableDays}
                                                onChange={(e) => updateRow(row.id, 'availableDays', Math.min(5, Math.max(0, Number(e.target.value))))}
                                                className="w-16 text-center text-sm border border-border rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={cn(
                                                'badge text-xs',
                                                row.isUpdate
                                                    ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
                                                    : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
                                            )}>
                                                {row.isUpdate ? '将更新' : '新增'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {imageInfo && (
                        <details className="group">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                                查看原始截图
                            </summary>
                            <img
                                src={imageInfo.previewUrl}
                                alt="原始截图"
                                className="mt-2 max-h-48 max-w-full rounded-lg border border-border object-contain"
                            />
                        </details>
                    )}
                </div>
            )}
        </Modal>
    );
}
