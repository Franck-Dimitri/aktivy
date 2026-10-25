import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatItem = {
    label: string;
    value: ReactNode;
    sub?: string;
    /** Affiche un petit point vert pulsé (activité en cours). */
    live?: boolean;
    /** Évolution en % par rapport à la période précédente (null = pas de comparaison possible). */
    delta?: number | null;
};

/**
 * Bandeau de chiffres clés compact : une seule carte, séparateurs fins,
 * 2 colonnes sur mobile et 4 sur grand écran.
 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
    return (
        <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 lg:grid-cols-4', className)}>
            {items.map((item) => (
                <div key={item.label} className="bg-white px-5 py-3.5">
                    <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        {item.label}
                        {item.delta !== undefined && item.delta !== null && (
                            <span
                                className={cn(
                                    'ml-auto inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                                    item.delta >= 0 ? 'bg-green-50 text-aktivy-deep' : 'bg-red-50 text-red-700',
                                )}
                            >
                                {item.delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                {item.delta > 0 ? '+' : ''}
                                {item.delta}%
                            </span>
                        )}
                        {item.live && (
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                            </span>
                        )}
                    </dt>
                    <dd className="mt-1 flex items-baseline gap-1.5 text-xl font-semibold tracking-tight text-ink tabular-nums [&_small]:text-xs [&_small]:font-medium [&_small]:text-slate-400">
                        {item.value}
                    </dd>
                    {item.sub && <p className="mt-0.5 truncate text-xs text-slate-400">{item.sub}</p>}
                </div>
            ))}
        </dl>
    );
}