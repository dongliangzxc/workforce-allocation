import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@utils/cn.js';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   children: React.ReactNode,
 *   footer?: React.ReactNode,
 *   size?: 'sm' | 'md' | 'lg',
 * }} props
 */
export default function Modal({open, onClose, title, children, footer, size = 'md'}) {
    // ESC 关闭
    useEffect(() => {
        if (!open) return;
        const handler = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    const sizeClass = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
    }[size];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={cn('bg-white rounded-2xl shadow-xl w-full animate-scale-in', sizeClass)}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary-100 text-muted-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary-50 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
