import { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { PRESET_SKILLS, getDefaultSkillColor } from '../types/index.js';
import { cn } from '@utils/cn.js';

/**
 * @param {{
 *   value: string[],
 *   onChange: (tags: string[]) => void,
 *   placeholder?: string,
 *   presets?: string[],
 * }} props
 */
export default function TagInput({value = [], onChange, placeholder = '输入标签后按 Enter', presets = PRESET_SKILLS}) {
    const [input, setInput] = useState('');
    const inputRef = useRef(null);

    const add = (tag) => {
        const t = tag.trim();
        if (t && !value.includes(t)) {
            onChange([...value, t]);
        }
        setInput('');
    };

    const remove = (tag) => onChange(value.filter(t => t !== tag));

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(input);
        } else if (e.key === 'Backspace' && !input && value.length > 0) {
            remove(value[value.length - 1]);
        }
    };

    const unusedPresets = presets.filter(p => !value.includes(p));

    return (
        <div className="space-y-2">
            {/* Input area */}
            <div
                className="min-h-[42px] flex flex-wrap gap-1.5 px-3 py-2 border border-border rounded-lg cursor-text focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400 transition-all bg-white"
                onClick={() => inputRef.current?.focus()}
            >
                {value.map(tag => (
                    <span
                        key={tag}
                        className={cn('badge items-center gap-1 pr-1', getDefaultSkillColor(tag))}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); remove(tag); }}
                            className="hover:opacity-70"
                        >
                            <X size={11} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-20 text-sm outline-none bg-transparent text-foreground placeholder-muted-foreground"
                />
            </div>

            {/* Preset suggestions */}
            {unusedPresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {unusedPresets.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => add(tag)}
                            className={cn(
                                'badge items-center gap-1 cursor-pointer border border-dashed border-current opacity-60 hover:opacity-100 transition-opacity',
                                getDefaultSkillColor(tag),
                            )}
                        >
                            <Plus size={10} />
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
