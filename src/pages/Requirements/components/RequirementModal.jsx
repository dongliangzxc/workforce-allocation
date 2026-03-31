import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal.jsx';
import TagInput from '../../../components/TagInput.jsx';

const EMPTY = {name: '', description: '', mandays: 1, requiredSkills: [], priority: 2.0, mustThisWeek: true};

export function RequirementModal({open, requirement, onClose, onSave}) {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setForm(requirement ? {...requirement} : EMPTY);
        setErrors({});
    }, [requirement, open]);

    const set = (key, val) => setForm(f => ({...f, [key]: val}));

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = '需求名称不能为空';
        if (isNaN(Number(form.priority))) e.priority = '请输入有效的数字';
        return e;
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        onSave({...form, mandays: Number(form.mandays), priority: Number(form.priority)});
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={requirement ? '编辑需求' : '添加需求'}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>取消</button>
                    <button className="btn-primary" onClick={handleSave}>
                        {requirement ? '保存' : '添加'}
                    </button>
                </>
            }
        >
            {/* Name */}
            <div>
                <label className="label">需求名称 <span className="text-red-500">*</span></label>
                <input
                    className="input"
                    placeholder="如：用户中心改版"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="label">需求描述</label>
                <textarea
                    className="input resize-none"
                    rows={3}
                    placeholder="简要描述需求内容、背景和目标…"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                />
            </div>

            {/* Priority + Mandays */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">优先级（越小越紧急）</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="input"
                        placeholder="如 1.0、2.5…"
                        value={form.priority}
                        onChange={e => set('priority', e.target.value)}
                    />
                    {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
                </div>
                <div>
                    <label className="label">所需人天</label>
                    <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="input"
                        placeholder="如 3"
                        value={form.mandays}
                        onChange={e => set('mandays', e.target.value)}
                    />
                </div>
            </div>

            {/* Skills */}
            <div>
                <label className="label">所需技能标签</label>
                <TagInput value={form.requiredSkills} onChange={val => set('requiredSkills', val)} />
            </div>

            {/* Must complete this week */}
            <div className="flex items-center justify-between py-1">
                <div>
                    <p className="text-sm font-medium text-secondary-700">必须本周完成</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {form.mustThisWeek ? '本周内必须交付' : '可跨周持续推进，不限于本周'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => set('mustThisWeek', !form.mustThisWeek)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        form.mustThisWeek ? 'bg-primary-600' : 'bg-secondary-300'
                    }`}
                >
                    <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                            form.mustThisWeek ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>
        </Modal>
    );
}
