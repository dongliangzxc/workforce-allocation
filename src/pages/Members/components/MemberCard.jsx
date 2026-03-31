import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { getDefaultSkillColor } from '../../../types/index.js';
import { cn } from '@utils/cn.js';

export function MemberCard({member, onEdit, onDelete}) {
    const usedDays = 0; // 展示可用人天即可，已分配在 allocation 页面管理
    const pct = Math.min(member.availableDays / 10 * 100, 100);

    return (
        <div className="card hover:shadow-md transition-all animate-slide-up group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {member.name.slice(0, 1)}
                    </div>
                    <div>
                        <p className="font-semibold text-foreground text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role || '未设置角色'}</p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(member)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 text-muted-foreground hover:text-primary-600 transition-colors">
                        <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(member)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Available days */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>下周可用人天</span>
                    <span className="font-semibold text-foreground">{member.availableDays} 天</span>
                </div>
                <div className="h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary-400 rounded-full transition-all duration-500"
                        style={{width: `${pct}%`}}
                    />
                </div>
            </div>

            {/* Skills */}
            {member.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {member.skills.map(skill => (
                        <span key={skill} className={cn('badge', getDefaultSkillColor(skill))}>
                            {skill}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground italic">暂无技能标签</p>
            )}
        </div>
    );
}
