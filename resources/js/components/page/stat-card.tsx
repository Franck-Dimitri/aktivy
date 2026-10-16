import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
    label,
    value,
    sub,
    highlight = false,
    icon: Icon,
}: {
    label: string;
    value: number | string;
    sub?: string;
    highlight?: boolean;
    icon?: LucideIcon;
}) {
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-2xl border p-4 shadow-xs',
                highlight ? 'border-green-200 bg-aktivy-soft' : 'border-slate-200 bg-white',
            )}
        >
            {Icon && (
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        highlight ? 'bg-aktivy text-white shadow-sm shadow-green-600/25' : 'bg-slate-100 text-slate-500',
                    )}
                >
                    <Icon className="size-5" />
                </span>
            )}
            <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-ink">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}
