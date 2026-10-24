import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* Effet « halo vert qui suit la souris » repris du tableau de bord.
   Au repos : carte blanche à bordure grise. Au survol : la bordure et le fond
   s'illuminent légèrement en vert autour du curseur, la carte se soulève. */
const GLOW_CSS = `
.glow-card{--x:50%;--y:50%;position:relative;background:#e2e8f0;transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s ease}
.glow-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(260px circle at var(--x) var(--y),rgba(34,197,94,.55),transparent 45%);opacity:0;transition:opacity .35s ease}
.glow-card:hover{transform:translateY(-2px);box-shadow:0 22px 44px -26px rgba(21,128,61,.35)}
.glow-card:hover::before{opacity:1}
.glow-card-glow{background:radial-gradient(320px circle at var(--x) var(--y),rgba(34,197,94,.09),transparent 50%);opacity:0;transition:opacity .35s ease}
.glow-card:hover .glow-card-glow{opacity:1}
@media (prefers-reduced-motion:reduce){.glow-card,.glow-card:hover{transition:none;transform:none}}
`;

/** À rendre une fois par page qui utilise <GlowCard>. */
export function GlowStyles() {
    return <style>{GLOW_CSS}</style>;
}

function track(e: MouseEvent<HTMLElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - r.left}px`);
    el.style.setProperty('--y', `${e.clientY - r.top}px`);
}

type GlowCardProps = {
    children: ReactNode;
    /** Classes de l'enveloppe extérieure (ex. espacement, hauteur). */
    className?: string;
    /** Classes du contenu intérieur (ex. flex, gap). */
    contentClassName?: string;
};

/** Carte blanche à halo vert. Les icônes en `group-hover:` réagissent au survol de la carte. */
export function GlowCard({ children, className, contentClassName }: GlowCardProps) {
    return (
        <div onMouseMove={track} className={cn('glow-card group rounded-2xl p-px', className)}>
            <div className="relative h-full overflow-hidden rounded-[calc(1rem-1px)] bg-white">
                <div className="glow-card-glow pointer-events-none absolute inset-0" aria-hidden="true" />
                <div className={cn('relative h-full', contentClassName)}>{children}</div>
            </div>
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
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white sm:grid-cols-4 sm:divide-y-0">
            {items.map((m) => (
                <div key={m.label} className="flex flex-col gap-1 px-5 py-4 sm:px-6">
                    <span className="text-xs font-medium text-slate-500">{m.label}</span>
                    <span className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">
                        {m.value}
                        {m.live && <span className="size-2 rounded-full bg-motriks ring-4 ring-motriks/15" />}
                    </span>
                    {m.sub && <span className="text-xs text-slate-400">{m.sub}</span>}
                </div>
            ))}
        </div>
    );
}
