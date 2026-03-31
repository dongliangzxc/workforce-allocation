import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal.jsx';
import TagInput from '../../../components/TagInput.jsx';

const EMPTY = {name: '', role: '', availableDays: 5, skills: []};

export function MemberModal({open, member, onClose, onSave}) {
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        setForm(member ? {...member} : EMPTY);
    }, [member, open]);

    const set = (key, val) => setForm(f => ({...f, [key]: val}));
    const valid = form.name.trim().length > 0;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={member ? '编辑成员' : '添加成员'}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>取消</button>
                    <button className="btn-primary" disabled={!valid} onClick={() => { onSave(form); onClose(); }}>
                        {member ? '保存' : '添加'}
                    </button>
                </>
            }
        >
            {/* Name */}
            <div>
                <label className="label">姓名 <span className="text-red-500">*</span></label>
                <input className="input" placeholder="请输入姓名" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            {/* Role */}
            <div>
                <label className="label">角色</label>
                <input className="input" placeholder="如：前端工程师、测试工程师…" value={form.role} onChange={e => set('role', e.target.value)} />
            </div>

            {/* Available days */}
            <div>
                <label className="label">下周可用人天：<span className="font-bold text-primary-600">{form.availableDays}</span> 天</label>
                <input
                    type="range" min={0} max={5} step={0.5}
                    value={form.availableDays}
                    onChange={e => set('availableDays', Number(e.target.value))}
                    className="w-full accent-primary-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span><span>2.5</span><span>5</span>
                </div>
            </div>

            {/* Skills */}
            <div>
                <label className="label">技能 / 属性标签</label>
                <TagInput value={form.skills} onChange={val => set('skills', val)} />
            </div>
        </Modal>
    );
}
