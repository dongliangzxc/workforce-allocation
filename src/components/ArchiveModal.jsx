import { useState, useEffect } from 'react';
import { Archive } from 'lucide-react';
import Modal from './Modal.jsx';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onConfirm: (name: string) => void,
 *   defaultName: string,
 * }} props
 */
export default function ArchiveModal({open, onClose, onConfirm, defaultName}) {
    const [name, setName] = useState(defaultName || '');

    // 每次打开时同步默认值
    useEffect(() => {
        if (open) setName(defaultName || '');
    }, [open, defaultName]);

    const handleConfirm = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onConfirm(trimmed);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="归档本周排期"
            size="sm"
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>取消</button>
                    <button
                        className="btn-primary"
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                    >
                        <Archive size={14} />
                        确认归档
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-secondary-600">
                    将当前的成员、需求和分配结果保存为一条历史记录，以便日后查阅。
                </p>
                <div>
                    <label className="block text-xs font-medium text-secondary-700 mb-1.5">
                        周次名称
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                        placeholder="如：2026 第14周"
                        className="input w-full"
                        autoFocus
                    />
                </div>
            </div>
        </Modal>
    );
}
