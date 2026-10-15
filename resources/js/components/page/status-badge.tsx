import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const tones: Record<StatusTone, string> = {
    success: 'bg-green-50 text-green-700 ring-green-600/15',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/15',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    info: 'bg-blue-50 text-blue-700 ring-blue-600/15',
};

const dots: Record<StatusTone, string> = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-slate-400',
    info: 'bg-blue-500',
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
                tones[tone],
            )}
        >
            <span className={cn('size-1.5 rounded-full', dots[tone])} />
            {children}
        </span>
    );
}
