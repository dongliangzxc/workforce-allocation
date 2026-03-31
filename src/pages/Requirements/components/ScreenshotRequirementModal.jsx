import { useState, useRef, useCallback } from 'react';
import { UploadCloud, RefreshCw, CheckCircle, AlertCircle, Loader, Eye } from 'lucide-react';
import Modal from '../../../components/Modal.jsx';
import { callLLMWithImage } from '../../../utils/llm.js';
import { cn } from '@utils/cn.js';

const MAX_SIZE_MB = 5;

const RECOGNITION_PROMPT = `这是一张需求排期表截图，请提取其中所有有标题的需求行。

字段提取规则：
1. name：完整标题文字，保留【】前缀，如"【产品】Widgets策略优化"
2. direction：从标题【】中提取类别，如【产品】→"产品"，【策略】→"策略"，无则为""
3. priority：优先级列的数字（浮点），无则设为 99
4. included：【严格规则】只有当"是否排入"列明确写了"是"，或写了版本号格式（如"v5.10"、"v6.0"等）才为 true；
   单纯的空格、空白、"—"、"否"、无文字内容，一律为 false。
   注意：表格单元格中的空格≠有内容，请仔细辨认像素，不要把空白单元格识别为有版本号。
5. android / ios / fe / server：对应列的数字，999 或空视为 0
6. mandays：只统计 server 列的人天（该团队只关注 Server 端工作量）
7. risk：风险等级列内容，无则为 ""

只输出如下 JSON 数组，不要任何其他内容：
[
  {
    "name": "【产品】Widgets策略优化",
    "direction": "产品",
    "priority": 0.1,
    "included": true,
    "android": 3,
    "ios": 2,
    "fe": 2,
    "server": 3,
    "mandays": 3,
    "risk": ""
  }
]`;

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const [prefix, base64] = dataUrl.split(',');
            const mimeType = prefix.match(/data:([^;]+)/)?.[1] || 'image/png';
            resolve({base64, mimeType, previewUrl: dataUrl});
        };
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
    });
}

function RiskBadge({risk}) {
    if (!risk) return null;
    const isBlock = risk.includes('阻塞');
    return (
        <span className={cn(
            'badge text-xs whitespace-nowrap',
            isBlock ? 'bg-red-100 text-red-700' : 'bg-accent-100 text-accent-700',
        )}>
            {risk.length > 8 ? risk.slice(0, 7) + '…' : risk}
        </span>
    );
}

function PlatformTags({android, ios, fe, server}) {
    const items = [
        {label: 'Android', val: android, color: 'bg-emerald-50 text-emerald-700'},
        {label: 'iOS', val: ios,     color: 'bg-slate-100 text-slate-600'},
        {label: 'FE',  val: fe,      color: 'bg-blue-50 text-blue-700'},
        {label: 'Svr', val: server,  color: 'bg-orange-50 text-orange-700'},
    ].filter(i => i.val > 0);
    if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {items.map(i => (
                <span key={i.label} className={cn('badge text-xs', i.color)}>
                    {i.label} {i.val}
                </span>
            ))}
        </div>
    );
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   llmConfig: { baseURL: string, apiKey: string, model: string },
 *   existingRequirements: { name: string }[],
 *   onImport: (items: object[]) => void,
 * }} props
 */
export function ScreenshotRequirementModal({open, onClose, llmConfig, existingRequirements, onImport}) {
    const [phase, setPhase] = useState('idle');
    const [imageInfo, setImageInfo] = useState(null);
    const [rows, setRows] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const fileInputRef = useRef(null);

    const reset = () => {
        setPhase('idle');
        setImageInfo(null);
        setRows([]);
        setErrorMsg('');
        setShowAll(false);
    };

    const handleClose = () => { reset(); onClose(); };

    const processFile = useCallback(async (file) => {
        if (!file?.type.startsWith('image/')) {
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

            const match = raw.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('模型未返回有效 JSON，请重试');

            const parsed = JSON.parse(match[0]);
            if (!Array.isArray(parsed)) throw new Error('返回格式错误');
            if (parsed.length === 0) {
                setErrorMsg('未识别到任何需求行，请检查截图是否包含需求表格');
                setPhase('error');
                return;
            }

            const existingNames = new Set(existingRequirements.map(r => r.name));
            const mapped = parsed.map(item => {
                const android = item.android === 999 ? 0 : (Number(item.android) || 0);
                const ios     = item.ios     === 999 ? 0 : (Number(item.ios)     || 0);
                const fe      = item.fe      === 999 ? 0 : (Number(item.fe)      || 0);
                const server  = item.server  === 999 ? 0 : (Number(item.server)  || 0);
                // 只统计 server 人天
                const mandays = server || 1;
                const isIncluded = !!item.included;

                return {
                    id:        crypto.randomUUID(),
                    name:      item.name || '',
                    direction: item.direction || '',
                    priority:  Number(item.priority) || 99,
                    included:  isIncluded,
                    android, ios, fe, server,
                    mandays,
                    risk:      item.risk || '',
                    // server=0 的排入项默认不勾选（server团队不需要）
                    selected:  isIncluded && server > 0,
                    isUpdate:  existingNames.has(item.name),
                };
            });

            setRows(mapped);
            // 若所有都未排入，自动展开全部
            if (mapped.every(r => !r.included)) setShowAll(true);
            setPhase('preview');
        } catch (e) {
            setErrorMsg(e.message || '识别失败，请重试');
            setPhase('error');
        }
    }, [llmConfig, existingRequirements]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const toggleRow   = (id) => setRows(r => r.map(row => row.id === id ? {...row, selected: !row.selected} : row));
    const toggleAll   = () => { const sel = visibleRows.every(r => r.selected); setRows(r => r.map(row => ({...row, selected: visibleRows.find(v => v.id === row.id) ? !sel : row.selected}))); };
    const updateRow   = (id, key, val) => setRows(r => r.map(row => row.id === id ? {...row, [key]: val} : row));

    const visibleRows    = showAll ? rows : rows.filter(r => r.included);
    const selectedCount  = rows.filter(r => r.selected).length;
    const includedCount  = rows.filter(r => r.included).length;

    const handleImport = () => {
        const selected = rows.filter(r => r.selected && r.name.trim());
        onImport(selected);
        handleClose();
    };

    const renderFooter = () => {
        if (phase === 'preview') return (
            <>
                <button className="btn-secondary" onClick={reset}><RefreshCw size={14} />重新上传</button>
                <button className="btn-secondary" onClick={handleClose}>取消</button>
                <button className="btn-primary" disabled={selectedCount === 0} onClick={handleImport}>
                    <CheckCircle size={14} />导入选中（{selectedCount} 条）
                </button>
            </>
        );
        if (phase === 'error') return (
            <>
                <button className="btn-secondary" onClick={reset}><RefreshCw size={14} />重新上传</button>
                <button className="btn-secondary" onClick={handleClose}>关闭</button>
            </>
        );
        return null;
    };

    return (
        <Modal open={open} onClose={handleClose} title="从截图导入需求" size="lg" footer={renderFooter()}>

            {/* ── idle ── */}
            {phase === 'idle' && (
                <div
                    className={cn(
                        'flex flex-col items-center justify-center h-52 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                        isDragOver ? 'border-primary-400 bg-primary-50' : 'border-border hover:border-primary-300 hover:bg-secondary-50',
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <UploadCloud size={36} className={isDragOver ? 'text-primary-500' : 'text-muted-foreground'} />
                    <p className="mt-3 text-sm font-medium text-foreground">点击或拖拽上传需求排期截图</p>
                    <p className="mt-1 text-xs text-muted-foreground">AI 将自动识别标题、优先级、是否排入、各端人天</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">支持 PNG / JPG / WebP，最大 5MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
                </div>
            )}

            {/* ── recognizing ── */}
            {phase === 'recognizing' && (
                <div className="flex flex-col items-center gap-4 py-6">
                    {imageInfo && (
                        <img src={imageInfo.previewUrl} alt="截图预览"
                            className="max-h-40 max-w-full rounded-lg border border-border object-contain shadow-sm" />
                    )}
                    <div className="flex items-center gap-2.5 text-primary-600">
                        <Loader size={18} className="animate-spin" />
                        <span className="text-sm font-medium">AI 识别中，请稍候…</span>
                    </div>
                    <p className="text-xs text-muted-foreground">正在解析需求标题、优先级、排入状态和各端工时</p>
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

            {/* ── preview ── */}
            {phase === 'preview' && (
                <div className="space-y-3">
                    {/* 统计 & 筛选器 */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg ring-1 ring-emerald-200">
                            <CheckCircle size={14} />
                            共识别 {rows.length} 条，已排入 {includedCount} 条，已选 {selectedCount} 条
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-secondary-600">
                                <Eye size={13} />
                                显示全部（含未排入）
                                <button
                                    type="button"
                                    onClick={() => setShowAll(v => !v)}
                                    className={`relative inline-flex h-4 w-8 shrink-0 rounded-full border-2 border-transparent transition-colors ${showAll ? 'bg-primary-500' : 'bg-secondary-300'}`}
                                >
                                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${showAll ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </label>
                            <button className="text-xs text-primary-600 hover:text-primary-700 font-medium" onClick={toggleAll}>
                                {visibleRows.every(r => r.selected) ? '取消全选' : '全选'}
                            </button>
                        </div>
                    </div>

                    {/* 表格 */}
                    <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-xs min-w-[640px]">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-border">
                                    <th className="w-8 px-2 py-2.5 text-center">
                                        <input type="checkbox"
                                            checked={visibleRows.length > 0 && visibleRows.every(r => r.selected)}
                                            onChange={toggleAll}
                                            className="accent-primary-500" />
                                    </th>
                                    <th className="text-left px-2 py-2.5 font-medium text-secondary-600 min-w-40">需求名称</th>
                                    <th className="text-left px-2 py-2.5 font-medium text-secondary-600 w-16">方向</th>
                                    <th className="text-center px-2 py-2.5 font-medium text-secondary-600 w-16">优先级</th>
                                    <th className="text-left px-2 py-2.5 font-medium text-secondary-600 w-36">各端人天</th>
                                    <th className="text-center px-2 py-2.5 font-medium text-secondary-600 w-16">Server 天</th>
                                    <th className="text-center px-2 py-2.5 font-medium text-secondary-600 w-20">风险</th>
                                    <th className="text-center px-2 py-2.5 font-medium text-secondary-600 w-16">状态</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.map((row, i) => (
                                    <tr key={row.id} className={cn(
                                        'border-b border-border last:border-0 transition-colors',
                                        !row.included ? 'opacity-50' : '',
                                        row.selected ? (i % 2 === 0 ? 'bg-white' : 'bg-secondary-50/40') : 'bg-secondary-50',
                                    )}>
                                        <td className="px-2 py-2 text-center">
                                            <input type="checkbox" checked={row.selected}
                                                onChange={() => toggleRow(row.id)} className="accent-primary-500" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                value={row.name}
                                                onChange={e => updateRow(row.id, 'name', e.target.value)}
                                                className="w-full text-xs text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary-400 outline-none py-0.5"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                value={row.direction}
                                                onChange={e => updateRow(row.id, 'direction', e.target.value)}
                                                className="w-full text-xs text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary-400 outline-none py-0.5"
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <input
                                                type="number" step="0.1" min="0"
                                                value={row.priority}
                                                onChange={e => updateRow(row.id, 'priority', Number(e.target.value))}
                                                className="w-14 text-center text-xs border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-300"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <PlatformTags android={row.android} ios={row.ios} fe={row.fe} server={row.server} />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <input
                                                type="number" step="0.5" min="0.5"
                                                value={row.mandays}
                                                onChange={e => updateRow(row.id, 'mandays', Number(e.target.value))}
                                                className="w-14 text-center text-xs border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-300"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <RiskBadge risk={row.risk} />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <span className={cn('badge text-xs', row.isUpdate
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
                            <img src={imageInfo.previewUrl} alt="原始截图"
                                className="mt-2 max-h-48 max-w-full rounded-lg border border-border object-contain" />
                        </details>
                    )}
                </div>
            )}
        </Modal>
    );
}
