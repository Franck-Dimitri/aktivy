import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    BadgeDollarSign,
    CalendarCheck,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    MapPin,
    Package,
    ShoppingCart,
    Star,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { sales as terrainSales } from '@/routes/terrain';
import { show as reportShow } from '@/routes/terrain/report';

/* ─── Types ─── */

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

/* ─── Formatters ─── */

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}


/* ─── Carte produit ─── */

function ProductSaleCard({ line, rank }: { line: SaleLine; rank: number }) {
    return (
        <div className={cn(
            'relative flex flex-col overflow-hidden rounded-2xl ring-1 transition-all hover:shadow-sm',
            rank === 0 ? 'bg-motriks-soft ring-green-200' : 'bg-white ring-slate-100',
        )}>
            {/* Badge rang #1 */}
            {rank === 0 && (
                <span className="absolute right-2.5 top-2.5 z-10 flex size-6 items-center justify-center rounded-full bg-motriks text-white shadow-sm">
                    <Star className="size-3.5 fill-white" />
                </span>
            )}

            {/* Image produit */}
            {line.image_url ? (
                <img
                    src={line.image_url}
                    alt={line.product_name}
                    className="h-32 w-full object-cover"
                />
            ) : (
                <div className="flex h-32 w-full items-center justify-center bg-slate-100">
                    <Package className="size-8 text-slate-200" />
                </div>
            )}

            {/* Infos */}
            <div className="flex flex-col gap-2 p-3.5">
                {/* Nom + prix unitaire */}
                <div>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                        {line.product_name}
                    </p>
                    {line.unit_price > 0 && (
                        <p className="mt-0.5 text-xs text-slate-400">
                            {formatMoney(line.unit_price)} FCFA / {line.unit}
                        </p>
                    )}
                </div>

                {/* Séparateur */}
                <div className="h-px bg-slate-100" />

                {/* Quantité + CA */}
                <div className="flex items-end justify-between gap-1">
                    <div>
                        <p className="text-2xl font-extrabold tracking-tight text-ink tabular-nums">
                            {line.units_sold}
                        </p>
                        <p className="text-xs text-slate-400">
                            {line.unit} vendu{line.units_sold > 1 ? 's' : ''}
                        </p>
                    </div>
                    {line.revenue > 0 && (
                        <div className="text-right">
                            <p className={cn(
                                'text-base font-bold tabular-nums',
                                rank === 0 ? 'text-motriks-deep' : 'text-slate-700',
                            )}>
                                {formatMoney(line.revenue)}
                            </p>
                            <p className="text-[10px] text-slate-400">FCFA</p>
                        </div>
                    )}
                </div>

                {/* Note produit */}
                {line.notes && (
                    <p className="rounded-xl bg-white/60 px-2.5 py-1.5 text-xs italic text-slate-500">
                        {line.notes}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ─── Carte journée ─── */

function DayCard({ day, defaultOpen = false }: { day: SaleDay; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const date = new Date(day.date + 'T00:00:00');
    const dayNum = date.getDate().toString().padStart(2, '0');
    const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' });
    const hasLines = day.lines.length > 0;

    return (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-100 bg-white shadow-sm">
            {/* En-tête journée */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-green-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-inset"
            >
                {/* Badge date */}
                <div className={cn(
                    'flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl text-center ring-1 ring-inset transition-all',
                    day.total_revenue > 0
                        ? 'bg-motriks-soft ring-green-600/10'
                        : 'bg-slate-50 ring-slate-200',
                )}>
                    <p className={cn(
                        'text-base font-extrabold leading-none',
                        day.total_revenue > 0 ? 'text-motriks-deep' : 'text-slate-400',
                    )}>
                        {dayNum}
                    </p>
                    <p className={cn(
                        'mt-0.5 text-[10px] font-medium capitalize',
                        day.total_revenue > 0 ? 'text-motriks' : 'text-slate-400',
                    )}>
                        {weekday}
                    </p>
                </div>

                {/* Infos jour */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{day.site_name}</p>
                            {day.site_city && (
                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                    <MapPin className="size-3" />
                                    {day.site_city}
                                </p>
                            )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <p className={cn(
                                'text-base font-bold tabular-nums',
                                day.total_revenue > 0 ? 'text-motriks-deep' : 'text-slate-300',
                            )}>
                                {formatMoney(day.total_revenue)}
                                <span className="ml-0.5 text-xs font-medium text-slate-400">FCFA</span>
                            </p>
                            <p className="text-xs text-slate-400">
                                {day.total_units} unité{day.total_units > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {hasLines ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
                                <Package className="size-3" />
                                {day.lines.length} produit{day.lines.length > 1 ? 's' : ''} vendu{day.lines.length > 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-100">
                                Aucune vente
                            </span>
                        )}
                        {day.has_incident && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                <AlertTriangle className="size-3" />
                                Incident
                            </span>
                        )}
                    </div>
                </div>

                {/* Chevron */}
                <span className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-all duration-200',
                    open && 'border-green-200 bg-motriks-soft text-motriks-deep rotate-180',
                )}>
                    <ChevronDown className="size-3.5" />
                </span>
            </button>

            {/* Détail produits */}
            {open && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    {hasLines ? (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {day.lines.map((line, i) => (
                                    <ProductSaleCard key={line.product_name} line={line} rank={i} />
                                ))}
                            </div>

                            {/* Total ligne */}
                            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-3.5">
                                <div>
                                    <p className="text-xs font-medium text-slate-400">
                                        {day.total_units} unité{day.total_units > 1 ? 's' : ''} vendues sur {day.lines.reduce((s, l) => s + l.units_sold, 0)} produits
                                    </p>
                                    <p className="mt-0.5 text-sm text-slate-300">Total journée</p>
                                </div>
                                <p className="text-xl font-extrabold tabular-nums text-white">
                                    {formatMoney(day.total_revenue)}
                                    <span className="ml-1 text-sm font-normal text-slate-400">FCFA</span>
                                </p>
                            </div>

                            {/* Notes */}
                            {day.notes && (
                                <div className="mt-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100">
                                    <p className="text-xs font-semibold text-slate-400">Notes</p>
                                    <p className="mt-0.5 text-sm text-slate-600">{day.notes}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <ShoppingCart className="size-8 text-slate-200" />
                            <p className="text-sm text-slate-400">Aucune vente enregistrée ce jour.</p>
                        </div>
                    )}

                    {/* Lien vers le rapport */}
                    <a
                        href={reportShow({ visit: day.visit_id }).url}
                        className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-motriks-deep"
                    >
                        <ClipboardList className="size-3.5" />
                        Voir le rapport complet
                        <ChevronRight className="size-3" />
                    </a>
                </div>
            )}
        </div>
    );
}

/* ─── Bloc mois ─── */

function MonthBlock({ month }: { month: MonthGroup }) {
    const [collapsed, setCollapsed] = useState(false);
    const maxRevenue = Math.max(...month.top_products.map((p) => p.revenue), 1);

    return (
        <div className="flex flex-col gap-3">
            {/* En-tête mois */}
            <GlowCard contentClassName="p-0">
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full p-5 text-left transition-colors hover:bg-green-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-inset"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        {/* Info mois */}
                        <div>
                            <p className="text-lg font-bold capitalize text-ink">{month.key}</p>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {month.reports_count} rapport{month.reports_count > 1 ? 's' : ''}
                                {' · '}
                                {month.units} unité{month.units > 1 ? 's' : ''} vendues
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* CA mois */}
                            <div className="text-right">
                                <p className="text-2xl font-extrabold tabular-nums text-motriks-deep">
                                    {formatMoney(month.revenue)}
                                </p>
                                <p className="text-xs text-slate-400">FCFA ce mois</p>
                            </div>

                            <span className={cn(
                                'flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-all duration-200',
                                !collapsed ? 'border-green-200 bg-motriks-soft text-motriks-deep rotate-180' : '',
                            )}>
                                <ChevronDown className="size-4" />
                            </span>
                        </div>
                    </div>

                    {/* Top produits du mois */}
                    {month.top_products.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <p className="text-xs font-semibold text-slate-400">Top ce mois :</p>
                            {month.top_products.map((p, i) => {
                                const pct = Math.round((p.revenue / maxRevenue) * 100);
                                return (
                                    <div key={p.name} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                        {p.image_url ? (
                                            <img src={p.image_url} alt={p.name} className="size-7 rounded-lg object-cover" />
                                        ) : (
                                            <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100">
                                                <Package className="size-3.5 text-slate-300" />
                                            </span>
                                        )}
                                        <div>
                                            <p className="max-w-[100px] truncate text-xs font-semibold text-ink">{p.name}</p>
                                            <div className="mt-0.5 flex items-center gap-1.5">
                                                <div className="relative h-1 w-14 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full',
                                                            i === 0 ? 'bg-motriks' : 'bg-motriks/50',
                                                        )}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400">
                                                    {formatMoney(p.revenue)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </button>
            </GlowCard>

            {/* Jours du mois */}
            {!collapsed && (
                <div className="flex flex-col gap-2 pl-2">
                    {month.days.map((day, i) => (
                        <DayCard key={day.report_id} day={day} defaultOpen={i === 0} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Page ─── */

export default function TerrainVentes({ summary, months }: Props) {
    const [filter, setFilter] = useState<string>('all');

    const monthKeys = useMemo(() => months.map((m) => m.key), [months]);

    const visibleMonths = useMemo(
        () => (filter === 'all' ? months : months.filter((m) => m.key === filter)),
        [months, filter],
    );

    return (
        <>
            <Head title="Mes ventes" />
            <GlowStyles />

            <Page
                title="Mes ventes"
                description="Historique complet de vos ventes par journée"
            >
                {months.length === 0 ? (
                    <GlowCard contentClassName="p-10">
                        <EmptyState
                            icon={ShoppingCart}
                            title="Aucune vente enregistrée"
                            description="Vos ventes apparaîtront ici une fois vos rapports journaliers soumis."
                        />
                    </GlowCard>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* KPIs globaux */}
                        <MetricStrip
                            items={[
                                {
                                    label: 'CA total',
                                    value: (
                                        <>
                                            {formatMoney(summary.total_revenue)}
                                            <span className="text-sm font-medium text-slate-400">FCFA</span>
                                        </>
                                    ),
                                    sub: 'tous rapports soumis',
                                },
                                {
                                    label: 'Unités vendues',
                                    value: summary.total_units,
                                    sub: `sur ${summary.total_reports} rapport${summary.total_reports > 1 ? 's' : ''}`,
                                },
                                {
                                    label: 'Meilleur produit',
                                    value: summary.best_product
                                        ? summary.best_product.name
                                        : '—',
                                    sub: summary.best_product
                                        ? `${formatMoney(summary.best_product.revenue)} FCFA · ${summary.best_product.units} u`
                                        : 'aucune vente',
                                },
                                {
                                    label: 'Meilleure journée',
                                    value: summary.best_day
                                        ? formatMoney(summary.best_day.revenue)
                                        : '—',
                                    sub: summary.best_day
                                        ? `${summary.best_day.date} · ${summary.best_day.site_name}`
                                        : 'aucune vente',
                                },
                            ]}
                        />

                        {/* Meilleur produit — card mise en avant si image */}
                        {summary.best_product && (
                            <GlowCard contentClassName="p-0">
                                <div className="flex items-center gap-4 p-5">
                                    {summary.best_product.image_url ? (
                                        <img
                                            src={summary.best_product.image_url}
                                            alt={summary.best_product.name}
                                            className="size-16 rounded-2xl object-cover shadow-sm ring-1 ring-slate-100"
                                        />
                                    ) : (
                                        <div className="flex size-16 items-center justify-center rounded-2xl bg-motriks-soft ring-1 ring-green-200">
                                            <Star className="size-7 fill-motriks text-motriks" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-motriks">
                                                Produit star
                                            </p>
                                        </div>
                                        <p className="mt-0.5 text-base font-bold text-ink">
                                            {summary.best_product.name}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1.5 font-semibold text-motriks-deep">
                                                <BadgeDollarSign className="size-3.5" />
                                                {formatMoney(summary.best_product.revenue)} FCFA
                                            </span>
                                            <span className="text-slate-300">·</span>
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <Package className="size-3.5" />
                                                {summary.best_product.units} unité{summary.best_product.units > 1 ? 's' : ''} vendues
                                            </span>
                                        </div>
                                    </div>
                                    <TrendingUp className="size-8 shrink-0 text-motriks opacity-20" />
                                </div>
                            </GlowCard>
                        )}

                        {/* Filtre par mois */}
                        {monthKeys.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFilter('all')}
                                    className={cn(
                                        'h-8 rounded-xl px-4 text-sm font-medium transition-all',
                                        filter === 'all'
                                            ? 'bg-motriks text-white shadow-sm shadow-motriks/25'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                    )}
                                >
                                    Tout afficher
                                </button>
                                {monthKeys.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFilter(key)}
                                        className={cn(
                                            'h-8 rounded-xl px-4 text-sm font-medium capitalize transition-all',
                                            filter === key
                                                ? 'bg-motriks text-white shadow-sm shadow-motriks/25'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                        )}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Timeline par mois */}
                        {visibleMonths.map((month) => (
                            <MonthBlock key={month.key} month={month} />
                        ))}
                    </div>
                )}
            </Page>
        </>
    );
}

TerrainVentes.layout = {
    breadcrumbs: [{ title: 'Mes ventes', href: terrainSales().url }],
};
