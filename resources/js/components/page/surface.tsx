import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SurfaceCardProps = {
    children: ReactNode;
    /** Classes de la carte (ex. espacement, hauteur, colonnes). */
    className?: string;
    /** Classes du contenu (ex. flex, gap, padding). */
    contentClassName?: string;
    /** Réagit au survol (bordure plus marquée, ombre) : pour les cartes cliquables. */
    interactive?: boolean;
};

/**
 * Carte blanche sobre, au même style que les listes (personnel, sites, produits…) :
 * bordure fine, ombre très légère. Les icônes en `group-hover:` réagissent au survol de la carte.
 */
export function SurfaceCard({ children, className, contentClassName, interactive = false }: SurfaceCardProps) {
    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs',
                interactive && 'transition-[border-color,box-shadow] duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5',
                className,
            )}
        >
            <div className={cn('relative h-full', contentClassName)}>{children}</div>
        </div>
    );
}

type Metric = {
    label: string;
    value: ReactNode;
    sub?: string;
    /** Affiche un point vert « en direct ». */
    live?: boolean;
};

/** Bandeau de 4 chiffres clés, sobre (remplace les grosses cartes de stats). */
export function MetricStrip({ items }: { items: Metric[] }) {
    return (
        <div className={cn('grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white', items.length === 3 ? 'sm:grid-cols-3 sm:divide-y-0' : 'lg:grid-cols-4 lg:divide-y-0')}>
            {items.map((m) => (
                <div key={m.label} className="flex min-w-0 flex-col gap-1 px-4 py-4 sm:px-6">
                    <span className="text-xs font-medium text-slate-500">{m.label}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xl font-semibold tracking-tight text-ink tabular-nums xl:text-2xl">
                        {m.value}
                        {m.live && <span className="size-2 rounded-full bg-motriks ring-4 ring-motriks/15" />}
                    </span>
                    {m.sub && <span className="text-xs text-slate-400">{m.sub}</span>}
                </div>
            ))}
        </div>
    );
}
