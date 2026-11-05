import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* Briques des pages de liste : monogramme, bandeau de chiffres, filtre segmenté, état vide. */

const AVATAR_TONES = [
    'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    'bg-sky-50 text-sky-700 ring-sky-600/10',
    'bg-violet-50 text-violet-700 ring-violet-600/10',
    'bg-amber-50 text-amber-700 ring-amber-600/10',
    'bg-rose-50 text-rose-700 ring-rose-600/10',
    'bg-teal-50 text-teal-700 ring-teal-600/10',
];

/** Monogramme de l'entreprise, teinte stable d'une visite à l'autre. */
export function CompanyAvatar({ name, muted, className }: { name: string; muted?: boolean; className?: string }) {
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

    return (
        <span
            aria-hidden
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold tracking-tight ring-1 ring-inset',
                muted ? 'bg-slate-100 text-slate-400 ring-slate-500/10' : AVATAR_TONES[hash % AVATAR_TONES.length],
                className,
            )}
        >
            {initials || '?'}
        </span>
    );
}

export type Metric = { label: string; value: number; hint?: string; icon: LucideIcon; tone?: 'default' | 'amber' | 'red' | 'green' | 'blue'; pulse?: boolean };

const METRIC_ICON: Record<NonNullable<Metric['tone']>, string> = {
    default: 'bg-slate-100 text-slate-500',
    green: 'bg-motriks-soft text-motriks-deep',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
};

/** Bandeau de chiffres clés : une seule carte, séparateurs fins. */
export function MetricRow({ items }: { items: Metric[] }) {
    return (
        <dl
            className={cn(
                'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-sidebar-border',
                items.length === 3 ? 'sm:grid-cols-3' : 'lg:grid-cols-4',
            )}
        >
            {items.map(({ label, value, hint, icon: Icon, tone = 'default', pulse }) => (
                <div key={label} className="flex items-start gap-3.5 bg-white px-5 py-4 dark:bg-card">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', METRIC_ICON[tone])}>
                        <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <dt className="flex items-center gap-2 truncate text-xs font-medium text-slate-500">
                            {label}
                            {pulse && value > 0 && (
                                <span className="relative flex size-1.5">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-70 motion-reduce:animate-none" />
                                    <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
                                </span>
                            )}
                        </dt>
                        <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</dd>
                        {hint && <p className="truncate text-[11px] text-slate-400">{hint}</p>}
                    </div>
                </div>
            ))}
        </dl>
    );
}

/**
 * Filtre segmenté avec compteurs. Sur téléphone, les options passent à la ligne et se partagent
 * la largeur : toutes restent visibles (un défilement horizontal cachait les dernières).
 */
export function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string; count?: number }[];
    label: string;
}) {
    return (
        <div role="tablist" aria-label={label} className="flex w-full flex-wrap gap-0.5 rounded-xl bg-slate-100/80 p-1 sm:inline-flex sm:w-auto sm:max-w-full sm:flex-nowrap sm:overflow-x-auto dark:bg-white/5">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'inline-flex h-9 grow basis-auto items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-motriks/30 focus-visible:outline-none sm:h-8 sm:shrink-0 sm:grow-0',
                            active ? 'bg-white text-ink shadow-sm ring-1 ring-slate-900/5 dark:bg-card' : 'text-slate-500 hover:text-ink',
                        )}
                    >
                        {o.label}
                        {o.count !== undefined && (
                            <span className={cn('rounded-md px-1.5 text-[10px] tabular-nums', active ? 'bg-slate-100 text-slate-600 dark:bg-white/10' : 'text-slate-400')}>
                                {o.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** État vide sobre, à l'intérieur d'une carte. */
export function QuietEmpty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="relative flex size-14 items-center justify-center">
                <span className="absolute inset-0 rounded-2xl bg-motriks-soft ring-8 ring-motriks-soft/40" />
                <Icon className="relative size-6 text-motriks-deep" />
            </span>
            <h3 className="mt-5 text-[15px] font-semibold text-ink">{title}</h3>
            {children && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{children}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
