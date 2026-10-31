import { Head } from '@inertiajs/react';
import { CalendarCheck, ClipboardCheck, Package } from 'lucide-react';
import { useId, useMemo, useState, type MouseEvent } from 'react';
import { Page } from '@/components/page/page';
import { ProductImage } from '@/components/page/product-image';
import { StatStrip } from '@/components/page/stat-strip';
import { cn } from '@/lib/utils';
import { stats as terrainStats } from '@/routes/terrain';

/* ─────────────────────── Types ─────────────────────── */

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
    image_url: string | null;
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

/* ─────────────────────── Helpers ─────────────────────── */

const card = 'rounded-2xl border border-slate-200/80 bg-white';

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function Money({ amount }: { amount: number }) {
    return (
        <>
            {formatMoney(amount)}
            <small>FCFA</small>
        </>
    );
}

function delta(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

/* ─────────────────────── Graphique ─────────────────────── */

function TrendCard({ data }: { data: TrendPoint[] }) {
    const gradientId = useId();
    const [metric, setMetric] = useState<'revenue' | 'visits'>('revenue');
    const [active, setActive] = useState<number | null>(null);

    const values = useMemo(() => data.map((d) => (metric === 'revenue' ? d.revenue : d.visits)), [data, metric]);
    const max = Math.max(...values, 0);
    const total = values.reduce((s, v) => s + v, 0);
    const empty = max === 0;

    const points = values.map((v, i) => ({
        x: (i / Math.max(data.length - 1, 1)) * 100,
        y: 88 - (v / Math.max(max, 1)) * 74,
    }));

    const line = points
        .map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const mx = (prev.x + p.x) / 2;
            return `C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
        })
        .join(' ');
    const area = `${line} L 100 88 L 0 88 Z`;

    const fmt = (v: number) => (metric === 'revenue' ? `${formatMoney(v)} FCFA` : `${v} visite${v > 1 ? 's' : ''}`);

    const onMove = (e: MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - r.left) / r.width;
        setActive(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
    };

    return (
        <section className={cn(card, 'flex flex-col p-6')}>
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div>
                    <h2 className="text-base font-semibold text-ink">7 derniers jours</h2>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {empty ? 'Aucune activité sur la période' : `${fmt(total)} au total`}
                    </p>
                </div>
                <div role="tablist" aria-label="Indicateur" className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1 sm:inline-grid sm:w-auto">
                    {(['revenue', 'visits'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            role="tab"
                            aria-selected={metric === m}
                            onClick={() => setMetric(m)}
                            className={cn(
                                'h-8 rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                metric === m ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                            )}
                        >
                            {m === 'revenue' ? "Chiffre d'affaires" : 'Visites'}
                        </button>
                    ))}
                </div>
            </header>

            {/* La zone du graphique prend toute la hauteur restante de la carte */}
            <div className="relative mt-6 min-h-52 flex-1" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
                <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#12b76a" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#12b76a" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[14, 51, 88].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            x2="100"
                            y1={y}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="3 4"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    {!empty && <path d={area} fill={`url(#${gradientId})`} />}
                    <path
                        d={line}
                        fill="none"
                        stroke={empty ? '#cbd5e1' : '#039855'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>

                {/* Point du jour toujours visible */}
                {!empty && points.length > 0 && active === null && (
                    <span
                        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-motriks shadow ring-2 ring-white"
                        style={{ left: `${points[points.length - 1].x}%`, top: `${points[points.length - 1].y}%` }}
                    />
                )}

                {active !== null && points[active] && (
                    <>
                        <span
                            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-2 ring-motriks"
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
                            <p className="text-xs font-semibold whitespace-nowrap text-white tabular-nums">{fmt(values[active])}</p>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400 tabular-nums">
                {data.map((d) => (
                    <span key={d.label}>{d.label}</span>
                ))}
            </div>
        </section>
    );
}

/* ─────────────────────── Top produits + totaux ─────────────────────── */

function TopProductsCard({ products, totalVisits, totalReports }: { products: TopProduct[]; totalVisits: number; totalReports: number }) {
    const maxRevenue = Math.max(products[0]?.revenue ?? 0, 1);

    return (
        <section className={cn(card, 'flex flex-col overflow-hidden')}>
            <header className="px-5 pt-5 pb-3">
                <h2 className="text-base font-semibold text-ink">Top produits</h2>
                <p className="mt-0.5 text-sm text-slate-500">Ce mois, par chiffre d'affaires.</p>
            </header>

            {products.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200/80">
                        <Package className="size-5" />
                    </span>
                    <p className="text-sm text-slate-400">Aucune vente ce mois-ci.</p>
                </div>
            ) : (
                <ul className="flex-1 divide-y divide-slate-100 border-t border-slate-100">
                    {products.map((p, i) => (
                        <li key={p.product_name} className={cn('flex items-center gap-3 px-5 py-3', i === 0 && 'bg-motriks-soft/50')}>
                            <ProductImage src={p.image_url} alt={p.product_name} className="size-12" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className={cn('truncate text-sm font-semibold', i === 0 ? 'text-motriks-deep' : 'text-ink')}>
                                        <span className="mr-1.5 text-xs font-medium text-slate-400 tabular-nums">{i + 1}</span>
                                        {p.product_name}
                                    </p>
                                    <p className="shrink-0 text-sm font-bold text-ink tabular-nums">{formatMoney(p.revenue)}</p>
                                </div>
                                <div className="mt-1.5 flex items-center gap-2.5">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-motriks/80 transition-[width] duration-700 motion-reduce:transition-none"
                                            style={{ width: `${Math.round((p.revenue / maxRevenue) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="shrink-0 text-xs text-slate-400 tabular-nums">{p.units} u</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Totaux depuis le début */}
            <dl className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100">
                <div className="flex items-center gap-3 bg-white px-5 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-motriks-soft text-motriks-deep ring-1 ring-green-600/10 ring-inset">
                        <CalendarCheck className="size-4" />
                    </span>
                    <div>
                        <dd className="text-lg leading-none font-semibold text-ink tabular-nums">{totalVisits}</dd>
                        <dt className="mt-1 text-xs text-slate-500">Visites depuis le début</dt>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-5 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-motriks-soft text-motriks-deep ring-1 ring-green-600/10 ring-inset">
                        <ClipboardCheck className="size-4" />
                    </span>
                    <div>
                        <dd className="text-lg leading-none font-semibold text-ink tabular-nums">{totalReports}</dd>
                        <dt className="mt-1 text-xs text-slate-500">Rapports depuis le début</dt>
                    </div>
                </div>
            </dl>
        </section>
    );
}

/* ─────────────────────── Page ─────────────────────── */

export default function TerrainStats({ stats, trend, top_products }: Props) {
    const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const m = stats.this_month;
    const prev = stats.last_month;

    return (
        <>
            <Head title="Mes statistiques" />

            <Page title="Mes statistiques" description={`Mois en cours : ${currentMonth}`}>
                <div className="flex flex-col gap-4">
                    {/* Chiffres du mois, avec l'évolution face au mois dernier */}
                    <StatStrip
                        items={[
                            {
                                label: "Chiffre d'affaires",
                                value: <Money amount={m.revenue} />,
                                delta: delta(m.revenue, prev.revenue),
                                sub: `Mois dernier : ${formatMoney(prev.revenue)} FCFA`,
                            },
                            {
                                label: 'Unités vendues',
                                value: m.units,
                                delta: delta(m.units, prev.units),
                                sub: `Mois dernier : ${prev.units}`,
                            },
                            {
                                label: 'Visites',
                                value: m.visits,
                                delta: delta(m.visits, prev.visits),
                                sub: `Mois dernier : ${prev.visits}`,
                            },
                            {
                                label: 'Rapports soumis',
                                value: m.reports,
                                delta: delta(m.reports, prev.reports),
                                sub: `Mois dernier : ${prev.reports}`,
                            },
                        ]}
                    />

                    {/* Le bloc occupe la hauteur restante de l'écran */}
                    <div className="grid gap-4 lg:min-h-[calc(100dvh-20rem)] lg:grid-cols-[minmax(0,1fr)_24rem]">
                        {trend.length > 1 ? <TrendCard data={trend} /> : <div className="hidden lg:block" />}
                        <TopProductsCard products={top_products} totalVisits={stats.total_visits} totalReports={stats.total_reports} />
                    </div>
                </div>
            </Page>
        </>
    );
}

TerrainStats.layout = {
    breadcrumbs: [{ title: 'Mes statistiques', href: terrainStats().url }],
};