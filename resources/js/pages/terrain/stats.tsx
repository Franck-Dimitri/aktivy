import { Head } from '@inertiajs/react';
import {
    BadgeDollarSign,
    CalendarCheck,
    ClipboardCheck,
    Package,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useId, useState, type MouseEvent } from 'react';
import { Page } from '@/components/page/page';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { stats as terrainStats } from '@/routes/terrain';

type MonthStats = {
    revenue: number;
    units: number;
    visits: number;
    reports: number;
};

type TrendPoint = {
    label: string;
    revenue: number;
    visits: number;
};

type TopProduct = {
    product_name: string;
    units: number;
    revenue: number;
};

type Props = {
    stats: {
        this_month: MonthStats;
        last_month: MonthStats;
        total_visits: number;
        total_reports: number;
    };
    trend: TrendPoint[];
    top_products: TopProduct[];
};

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function delta(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

/* ─── Graphique de tendance ─── */

function TrendChart({ data }: { data: TrendPoint[] }) {
    const gradientId = useId();
    const [metric, setMetric] = useState<'visits' | 'revenue'>('revenue');
    const [active, setActive] = useState<number | null>(null);

    const values = data.map((d) => (metric === 'revenue' ? d.revenue : d.visits));
    const max = Math.max(...values, 1);
    const points = values.map((v, i) => ({
        x: (i / Math.max(data.length - 1, 1)) * 100,
        y: 88 - (v / max) * 74,
    }));

    const line = points.map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const mx = (prev.x + p.x) / 2;
        return `C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
    }).join(' ');
    const area = `${line} L 100 88 L 0 88 Z`;

    const fmt = (v: number) =>
        metric === 'revenue' ? `${formatMoney(v)} FCFA` : `${v} visite${v > 1 ? 's' : ''}`;

    const onMove = (e: MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - r.left) / r.width;
        setActive(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-ink">7 derniers jours</h3>
                    <p className="mt-0.5 text-sm text-slate-500">Évolution de votre activité.</p>
                </div>
                <div role="group" className="inline-flex rounded-xl bg-slate-100 p-1">
                    {(['revenue', 'visits'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMetric(m)}
                            aria-pressed={metric === m}
                            className={cn(
                                'h-7 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                metric === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                            )}
                        >
                            {m === 'revenue' ? 'CA' : 'Visites'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative h-44" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
                <svg
                    className="absolute inset-0 size-full overflow-visible"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.20" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[14, 51, 88].map((y) => (
                        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                    ))}
                    <path d={area} fill={`url(#${gradientId})`} />
                    <path d={line} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>

                {active !== null && points[active] && (
                    <>
                        <span
                            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-aktivy shadow"
                            style={{ left: `${points[active].x}%`, top: `${points[active].y}%` }}
                        />
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3 py-2 text-center shadow-lg"
                            style={{
                                left: `clamp(14%, ${points[active].x}%, 86%)`,
                                top: `calc(${points[active].y}% - 14px)`,
                            }}
                        >
                            <p className="text-[11px] text-slate-400">{data[active].label}</p>
                            <p className="text-xs font-semibold whitespace-nowrap text-white tabular-nums">
                                {fmt(values[active])}
                            </p>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400">
                {data.map((d) => (
                    <span key={d.label}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

/* ─── Carte comparaison mois ─── */

function CompareCard({ label, current, previous, formatter, icon: Icon }: {
    label: string;
    current: number;
    previous: number;
    formatter: (v: number) => string;
    icon: typeof BadgeDollarSign;
}) {
    const pct = delta(current, previous);
    const positive = pct === null || pct >= 0;

    return (
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            {/* Icône + label */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100">
                        <Icon className="size-3.5" />
                    </span>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                </div>
                {pct !== null && (
                    <span className={cn(
                        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                        positive ? 'bg-green-100 text-aktivy-deep' : 'bg-red-50 text-red-700',
                    )}>
                        {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {pct > 0 ? '+' : ''}{pct}%
                    </span>
                )}
            </div>

            {/* Valeur ce mois — hero */}
            <p className="text-2xl font-bold tabular-nums text-ink">
                {formatter(current)}
            </p>

            {/* Séparateur */}
            <div className="h-px bg-slate-200" />

            {/* Vs mois dernier */}
            <p className="text-xs text-slate-400">
                Mois dernier :{' '}
                <span className="font-medium text-slate-600">{formatter(previous)}</span>
            </p>
        </div>
    );
}

/* ─── Page ─── */

export default function TerrainStats({ stats, trend, top_products }: Props) {
    const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const m = stats.this_month;
    const prev = stats.last_month;

    return (
        <>
            <Head title="Mes statistiques" />
            <GlowStyles />

            <Page title="Mes statistiques" description={`Mois en cours : ${currentMonth}`}>
                <div className="flex flex-col gap-6">
                    {/* KPIs ce mois */}
                    <MetricStrip
                        items={[
                            {
                                label: "Chiffre d'affaires",
                                value: (
                                    <>
                                        {formatMoney(m.revenue)}
                                        <span className="text-sm font-medium text-slate-400">FCFA</span>
                                    </>
                                ),
                                sub: `Mois dernier : ${formatMoney(prev.revenue)} FCFA`,
                            },
                            {
                                label: 'Unités vendues',
                                value: m.units,
                                sub: `Mois dernier : ${prev.units}`,
                            },
                            {
                                label: 'Visites',
                                value: m.visits,
                                sub: `Mois dernier : ${prev.visits}`,
                            },
                            {
                                label: 'Rapports soumis',
                                value: m.reports,
                                sub: `Mois dernier : ${prev.reports}`,
                            },
                        ]}
                    />

                    {/* Tendance + Totaux globaux */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {trend.length > 1 && (
                            <GlowCard className="lg:col-span-2" contentClassName="p-6">
                                <TrendChart data={trend} />
                            </GlowCard>
                        )}

                        <GlowCard contentClassName="flex flex-col justify-center gap-6 p-6">
                            <div>
                                <h3 className="text-base font-semibold text-ink">Depuis le début</h3>
                                <p className="mt-0.5 text-sm text-slate-500">Totaux cumulés sur votre compte.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-aktivy-soft text-aktivy">
                                        <CalendarCheck className="size-5" />
                                    </div>
                                    <p className="mt-3 text-3xl font-bold tracking-tight text-ink tabular-nums">
                                        {stats.total_visits}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">Visites totales</p>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-aktivy-soft text-aktivy">
                                        <ClipboardCheck className="size-5" />
                                    </div>
                                    <p className="mt-3 text-3xl font-bold tracking-tight text-ink tabular-nums">
                                        {stats.total_reports}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">Rapports soumis</p>
                                </div>
                            </div>
                        </GlowCard>
                    </div>

                    {/* Comparaison mensuelle */}
                    <GlowCard contentClassName="p-6">
                        <div className="mb-5">
                            <h3 className="text-base font-semibold text-ink">Comparaison mensuelle</h3>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Ce mois vs mois dernier.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <CompareCard
                                label="Chiffre d'affaires"
                                icon={BadgeDollarSign}
                                current={m.revenue}
                                previous={prev.revenue}
                                formatter={(v: number) => `${formatMoney(v)} FCFA`}
                            />
                            <CompareCard
                                label="Unités vendues"
                                icon={Package}
                                current={m.units}
                                previous={prev.units}
                                formatter={(v: number) => `${v} unité${v > 1 ? 's' : ''}`}
                            />
                            <CompareCard
                                label="Visites"
                                icon={CalendarCheck}
                                current={m.visits}
                                previous={prev.visits}
                                formatter={(v: number) => `${v} visite${v > 1 ? 's' : ''}`}
                            />
                            <CompareCard
                                label="Rapports soumis"
                                icon={ClipboardCheck}
                                current={m.reports}
                                previous={prev.reports}
                                formatter={(v: number) => `${v} rapport${v > 1 ? 's' : ''}`}
                            />
                        </div>
                    </GlowCard>

                    {/* Top produits */}
                    {top_products.length > 0 && (
                        <GlowCard contentClassName="p-0">
                            <div className="border-b border-slate-100 px-6 py-5">
                                <h3 className="text-base font-semibold text-ink">Top produits ce mois</h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Vos meilleures performances par chiffre d'affaires.
                                </p>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {top_products.map((p, i) => {
                                    const maxRevenue = top_products[0]?.revenue ?? 1;
                                    const pct = Math.round((p.revenue / maxRevenue) * 100);
                                    const isFirst = i === 0;

                                    return (
                                        <li key={p.product_name} className={cn(
                                            'flex items-center gap-4 px-6 py-4 transition-colors',
                                            isFirst ? 'bg-aktivy-soft/50 hover:bg-aktivy-soft' : 'hover:bg-green-50/40',
                                        )}>
                                            {/* Rang */}
                                            <span className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-inset',
                                                isFirst
                                                    ? 'bg-aktivy text-white ring-0 shadow-sm shadow-green-500/30'
                                                    : i === 1
                                                        ? 'bg-green-100 text-aktivy-deep ring-green-600/10'
                                                        : 'bg-slate-50 text-slate-500 ring-slate-200',
                                            )}>
                                                {i + 1}
                                            </span>

                                            {/* Détail */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={cn(
                                                        'truncate text-sm font-semibold',
                                                        isFirst ? 'text-aktivy-deep' : 'text-ink',
                                                    )}>
                                                        {p.product_name}
                                                    </p>
                                                    <p className={cn(
                                                        'shrink-0 text-sm font-bold tabular-nums',
                                                        isFirst ? 'text-aktivy-deep' : 'text-slate-700',
                                                    )}>
                                                        {formatMoney(p.revenue) + ' FCFA'}
                                                    </p>
                                                </div>

                                                <div className="mt-1.5 flex items-center gap-3">
                                                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/80">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full transition-[width] duration-700',
                                                                isFirst ? 'bg-aktivy' : 'bg-aktivy/60',
                                                            )}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="shrink-0 text-xs text-slate-400">
                                                        {p.units} unité{p.units > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </GlowCard>
                    )}
                </div>
            </Page>
        </>
    );
}

TerrainStats.layout = {
    breadcrumbs: [{ title: 'Mes statistiques', href: terrainStats().url }],
};
