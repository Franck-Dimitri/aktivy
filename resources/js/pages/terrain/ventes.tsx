import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ChevronRight, MapPin, ShoppingCart, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { ProductImage } from '@/components/page/product-image';
import { StatStrip } from '@/components/page/stat-strip';
import { cn } from '@/lib/utils';
import { sales as terrainSales } from '@/routes/terrain';
import { show as reportShow } from '@/routes/terrain/report';

/* ─────────────────────── Types ─────────────────────── */

type SaleLine = {
    product_name: string;
    unit: string;
    unit_price: number;
    units_sold: number;
    revenue: number;
    image_url: string | null;
    notes: string | null;
};

type SaleDay = {
    report_id: number;
    visit_id: number;
    date: string;
    date_formatted: string;
    site_name: string;
    site_city: string | null;
    total_revenue: number;
    total_units: number;
    has_incident: boolean;
    incident_notes: string | null;
    notes: string | null;
    lines: SaleLine[];
};

type TopProduct = {
    name: string;
    units: number;
    revenue: number;
    image_url: string | null;
};

type MonthGroup = {
    key: string;
    revenue: number;
    units: number;
    reports_count: number;
    top_products: TopProduct[];
    days: SaleDay[];
};

type Summary = {
    total_revenue: number;
    total_units: number;
    total_reports: number;
    best_product: TopProduct | null;
    best_day: { date: string; revenue: number; site_name: string } | null;
};

type Props = {
    summary: Summary;
    months: MonthGroup[];
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

function aggregateProducts(months: MonthGroup[]): TopProduct[] {
    const map = new Map<string, TopProduct>();
    for (const m of months) {
        for (const d of m.days) {
            for (const l of d.lines) {
                const cur = map.get(l.product_name) ?? { name: l.product_name, units: 0, revenue: 0, image_url: l.image_url };
                cur.units += l.units_sold;
                cur.revenue += l.revenue;
                if (!cur.image_url && l.image_url) cur.image_url = l.image_url;
                map.set(l.product_name, cur);
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/* ─────────────────────── Journée (ligne dépliable) ─────────────────────── */

function DayRow({ day, defaultOpen = false }: { day: SaleDay; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const date = new Date(day.date + 'T00:00:00');
    const hasSales = day.total_revenue > 0;

    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-green-50/40 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none focus-visible:ring-inset"
            >
                <div
                    className={cn(
                        'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-center ring-1 ring-inset',
                        hasSales ? 'bg-motriks-soft text-motriks-deep ring-green-600/10' : 'bg-slate-50 text-slate-400 ring-slate-200',
                    )}
                >
                    <span className="text-sm leading-none font-bold">{String(date.getDate()).padStart(2, '0')}</span>
                    <span className="mt-0.5 text-[10px] font-medium capitalize opacity-80">
                        {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{day.site_name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {day.site_city && (
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" />
                                {day.site_city}
                            </span>
                        )}
                        <span>
                            {day.lines.length > 0 ? `${day.lines.length} produit${day.lines.length > 1 ? 's' : ''}` : 'Aucune vente'}
                        </span>
                        {day.has_incident && (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                                <AlertTriangle className="size-3" />
                                Incident
                            </span>
                        )}
                    </div>
                </div>

                {/* Aperçu des produits vendus (visible quand la ligne est repliée) */}
                {!open && day.lines.length > 0 && (
                    <div className="hidden -space-x-2 sm:flex" aria-hidden="true">
                        {day.lines.slice(0, 3).map((l) => (
                            <ProductImage key={l.product_name} src={l.image_url} alt="" className="size-8 rounded-lg ring-2 ring-white" />
                        ))}
                    </div>
                )}

                <div className="shrink-0 text-right">
                    <p className={cn('text-sm font-bold tabular-nums', hasSales ? 'text-motriks-deep' : 'text-slate-300')}>
                        {formatMoney(day.total_revenue)}
                        <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                        {day.total_units} unité{day.total_units > 1 ? 's' : ''}
                    </p>
                </div>

                <span
                    aria-hidden="true"
                    className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all duration-200',
                        open ? 'rotate-180 bg-motriks-soft text-motriks-deep' : 'bg-slate-50',
                    )}
                >
                    <ChevronDown className="size-4" />
                </span>
            </button>

            {open && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                    {day.lines.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-400">Aucune vente enregistrée ce jour.</p>
                    ) : (
                        <ul className="grid gap-2.5">
                            {day.lines.map((l) => (
                                <li key={l.product_name} className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
                                    <ProductImage src={l.image_url} alt={l.product_name} className="size-16" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">{l.product_name}</p>
                                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                            {l.units_sold} × {formatMoney(l.unit_price)} FCFA
                                        </p>
                                        {l.notes && <p className="mt-1 text-xs text-slate-400 italic">{l.notes}</p>}
                                    </div>
                                    <p className="shrink-0 text-sm font-bold text-motriks-deep tabular-nums">
                                        {formatMoney(l.revenue)}
                                        <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    {day.lines.length > 0 && (
                        <div className="mt-3 flex items-center justify-between px-1">
                            <p className="text-sm font-medium text-slate-500">Total de la journée</p>
                            <p className="text-lg font-bold text-motriks-deep tabular-nums">
                                {formatMoney(day.total_revenue)}
                                <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                            </p>
                        </div>
                    )}

                    {day.notes && (
                        <div className="mt-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
                            <p className="text-xs font-medium text-slate-400">Notes du jour</p>
                            <p className="mt-0.5 text-sm leading-relaxed text-ink">{day.notes}</p>
                        </div>
                    )}

                    {day.incident_notes && (
                        <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                <AlertTriangle className="size-3.5" />
                                Incident signalé
                            </p>
                            <p className="mt-0.5 text-sm leading-relaxed text-amber-900">{day.incident_notes}</p>
                        </div>
                    )}

                    <Link
                        href={reportShow({ visit: day.visit_id }).url}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-motriks-deep focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                    >
                        Voir le rapport complet
                        <ChevronRight className="size-3.5" />
                    </Link>
                </div>
            )}
        </li>
    );
}

/* ─────────────────────── Classement des produits ─────────────────────── */

function ProductRanking({ products, label }: { products: TopProduct[]; label: string }) {
    const top = products.slice(0, 5);
    const [star, ...rest] = top;
    const maxRevenue = Math.max(star?.revenue ?? 0, 1);

    return (
        <section className={cn(card, 'overflow-hidden')}>
            <header className="px-5 pt-4 pb-3">
                <h2 className="text-sm font-semibold text-ink">Top produits</h2>
                <p className="text-xs text-slate-400 capitalize">{label}</p>
            </header>

            {!star ? (
                <p className="px-5 pb-8 text-center text-sm text-slate-400">Aucune vente sur cette période.</p>
            ) : (
                <>
                    {/* Produit star : grande image, jamais rognée */}
                    <div className="mx-4 mb-3 rounded-2xl bg-motriks-soft/70 p-4 ring-1 ring-green-200/50">
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                                <ProductImage src={star.image_url} alt={star.name} className="size-24 rounded-2xl bg-white" />
                                <span className="absolute -top-2 -left-2 flex size-6 items-center justify-center rounded-full bg-motriks text-white shadow-sm ring-2 ring-white">
                                    <Star className="size-3 fill-white" />
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-motriks-deep">Produit star</p>
                                <p className="mt-0.5 line-clamp-2 text-base leading-snug font-bold text-ink">{star.name}</p>
                                <p className="mt-1 text-sm font-semibold text-motriks-deep tabular-nums">{formatMoney(star.revenue)} FCFA</p>
                                <p className="text-xs text-slate-500 tabular-nums">{star.units} unités vendues</p>
                            </div>
                        </div>
                    </div>

                    {rest.length > 0 && (
                        <ul className="divide-y divide-slate-100 border-t border-slate-100">
                            {rest.map((p, i) => (
                                <li key={p.name} className="flex items-center gap-3 px-5 py-3">
                                    <ProductImage src={p.image_url} alt={p.name} className="size-12" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="truncate text-sm font-medium text-ink">
                                                <span className="mr-1.5 text-xs font-semibold text-slate-400 tabular-nums">{i + 2}</span>
                                                {p.name}
                                            </p>
                                            <p className="shrink-0 text-sm font-bold text-slate-700 tabular-nums">{formatMoney(p.revenue)}</p>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-2.5">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-motriks/70 transition-[width] duration-700 motion-reduce:transition-none"
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
                </>
            )}
        </section>
    );
}

/* ─────────────────────── Page ─────────────────────── */

export default function TerrainVentes({ months }: Props) {
    const [filter, setFilter] = useState<string>('all');

    const visibleMonths = useMemo(() => (filter === 'all' ? months : months.filter((m) => m.key === filter)), [months, filter]);

    const stats = useMemo(() => {
        const days = visibleMonths.flatMap((m) => m.days);
        const best = days.reduce<SaleDay | null>((acc, d) => (acc === null || d.total_revenue > acc.total_revenue ? d : acc), null);
        return {
            revenue: visibleMonths.reduce((s, m) => s + m.revenue, 0),
            units: visibleMonths.reduce((s, m) => s + m.units, 0),
            reports: visibleMonths.reduce((s, m) => s + m.reports_count, 0),
            best,
        };
    }, [visibleMonths]);

    const products = useMemo(() => aggregateProducts(visibleMonths), [visibleMonths]);
    const periodLabel = filter === 'all' ? 'Toutes les périodes' : filter;
    const firstDayId = visibleMonths[0]?.days[0]?.report_id;

    return (
        <>
            <Head title="Mes ventes" />

            <Page title="Mes ventes" description="Historique de vos ventes, journée par journée">
                {months.length === 0 ? (
                    <div className={cn(card, 'p-10 sm:p-16')}>
                        <EmptyState
                            icon={ShoppingCart}
                            title="Aucune vente enregistrée"
                            description="Vos ventes apparaîtront ici une fois vos rapports journaliers soumis."
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <StatStrip
                            items={[
                                { label: "Chiffre d'affaires", value: <Money amount={stats.revenue} />, sub: periodLabel },
                                {
                                    label: 'Unités vendues',
                                    value: stats.units,
                                    sub: `sur ${stats.reports} rapport${stats.reports > 1 ? 's' : ''}`,
                                },
                                {
                                    label: 'Moyenne par rapport',
                                    value: <Money amount={stats.reports > 0 ? Math.round(stats.revenue / stats.reports) : 0} />,
                                    sub: 'par journée soumise',
                                },
                                {
                                    label: 'Meilleure journée',
                                    value: stats.best ? <Money amount={stats.best.total_revenue} /> : '–',
                                    sub: stats.best ? stats.best.date_formatted : 'aucune vente',
                                },
                            ]}
                        />

                        {months.length > 1 && (
                            <div
                                role="tablist"
                                aria-label="Période"
                                className="-mx-1 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1"
                            >
                                {['all', ...months.map((m) => m.key)].map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === key}
                                        onClick={() => setFilter(key)}
                                        className={cn(
                                            'h-8 shrink-0 rounded-xl px-4 text-sm font-medium whitespace-nowrap capitalize transition-all focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                            filter === key ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                                        )}
                                    >
                                        {key === 'all' ? 'Tout' : key}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
                            <div className="flex flex-col gap-5">
                                {visibleMonths.map((month) => (
                                    <section key={month.key} className="flex flex-col gap-2">
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-1">
                                            <h2 className="text-sm font-semibold text-ink capitalize">{month.key}</h2>
                                            <p className="text-xs text-slate-500 tabular-nums">
                                                <span className="font-semibold text-motriks-deep">{formatMoney(month.revenue)} FCFA</span>
                                                <span className="ml-3">
                                                    {month.units} unité{month.units > 1 ? 's' : ''}
                                                </span>
                                            </p>
                                        </div>

                                        <div className={cn(card, 'overflow-hidden')}>
                                            <ul className="divide-y divide-slate-100">
                                                {month.days.map((day) => (
                                                    <DayRow key={day.report_id} day={day} defaultOpen={day.report_id === firstDayId} />
                                                ))}
                                            </ul>
                                        </div>
                                    </section>
                                ))}
                            </div>

                            <div className="lg:sticky lg:top-6">
                                <ProductRanking products={products} label={periodLabel} />
                            </div>
                        </div>
                    </div>
                )}
            </Page>
        </>
    );
}

TerrainVentes.layout = {
    breadcrumbs: [{ title: 'Mes ventes', href: terrainSales().url }],
};