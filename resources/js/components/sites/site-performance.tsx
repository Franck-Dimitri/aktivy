import { Link } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, Award, Minus, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { show as personnelShow } from '@/routes/personnel';

type Period = { revenue: number; units: number; reports: number; external_revenue: number; average_per_report: number };

export type SitePerformanceData = {
    this_month: Period;
    last_month: Period;
    month_label: string;
    ranking_days: number;
    ranking_revenue: number;
    best_products: { name: string; unit: string; units: number; revenue: number; share: number }[];
    best_hostesses: { id: number; uuid: string; name: string; revenue: number; units: number; days: number }[];
};

const fcfa = (amount: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);

/** Évolution face au mois dernier : +12 %, −5 %, ou rien à comparer. */
function Trend({ now, before }: { now: number; before: number }) {
    if (before <= 0) {
        return <span className="text-xs text-slate-400">{now > 0 ? 'pas de vente le mois dernier' : '—'}</span>;
    }

    const pct = Math.round(((now - before) / before) * 100);
    const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;

    return (
        <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', pct > 0 ? 'text-motriks-deep' : pct < 0 ? 'text-red-600' : 'text-slate-500')}>
            <Icon className="size-3.5" />
            {pct > 0 ? '+' : ''}
            {pct} % <span className="font-normal text-slate-400">vs mois dernier</span>
        </span>
    );
}

function Metric({ label, value, unit, now, before, sub }: { label: string; value: string; unit?: string; now: number; before: number; sub?: string }) {
    return (
        <div className="min-w-0 bg-white px-5 py-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink tabular-nums">
                {value}
                {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                <Trend now={now} before={before} />
                {sub && <span className="text-xs text-slate-400">{sub}</span>}
            </div>
        </div>
    );
}

/**
 * Chiffres de vente du site : ce mois-ci face au mois dernier (à date égale), puis les meilleurs
 * produits et les meilleures hôtesses des 30 derniers jours. En lecture seule, pour tous les rôles.
 */
export function SitePerformance({ data, linkHostesses = true }: { data: SitePerformanceData; linkHostesses?: boolean }) {
    const { this_month: now, last_month: before } = data;
    const maxProduct = Math.max(...data.best_products.map((p) => p.revenue), 1);
    const maxHostess = Math.max(...data.best_hostesses.map((h) => h.revenue), 1);

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-ink">Performance du site</h2>
                    <p className="text-sm text-slate-500">
                        {data.month_label.charAt(0).toUpperCase() + data.month_label.slice(1)} à ce jour, comparé à la même période du mois dernier.
                    </p>
                </div>
            </header>

            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Chiffre d’affaires" value={fcfa(now.revenue)} unit="FCFA" now={now.revenue} before={before.revenue} />
                <Metric label="Unités vendues" value={fcfa(now.units)} now={now.units} before={before.units} />
                <Metric
                    label="CA moyen par rapport"
                    value={fcfa(now.average_per_report)}
                    unit="FCFA"
                    now={now.average_per_report}
                    before={before.average_per_report}
                    sub={`${now.reports} rapport${now.reports > 1 ? 's' : ''}`}
                />
                <div className="min-w-0 bg-white px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Dont boutiques extérieures</p>
                    <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink tabular-nums">
                        {fcfa(now.external_revenue)}
                        <span className="ml-1 text-sm font-medium text-slate-400">FCFA</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        {now.revenue > 0 ? `${Math.round((now.external_revenue / now.revenue) * 100)} % du chiffre d’affaires` : 'hors stock du point de vente'}
                    </p>
                </div>
            </div>

            <div className="grid gap-px border-t border-slate-100 bg-slate-100 lg:grid-cols-2">
                {/* Meilleurs produits */}
                <div className="bg-white px-5 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Package className="size-4 text-slate-400" />
                        Meilleurs produits
                        <span className="font-normal text-slate-400">· {data.ranking_days} derniers jours</span>
                    </h3>
                    {data.best_products.length === 0 ? (
                        <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">Aucune vente sur la période.</p>
                    ) : (
                        <ol className="mt-3 flex flex-col gap-3">
                            {data.best_products.map((p, i) => (
                                <li key={`${p.name}-${p.unit}`}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className={cn('w-4 shrink-0 text-xs font-semibold tabular-nums', i === 0 ? 'text-motriks-deep' : 'text-slate-400')}>{i + 1}</span>
                                            <span className="truncate font-medium text-ink">{p.name}</span>
                                        </span>
                                        <span className="shrink-0 font-semibold text-ink tabular-nums">
                                            {fcfa(p.revenue)} <span className="text-xs font-normal text-slate-400">FCFA</span>
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-3 pl-6">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div className={cn('h-full rounded-full', i === 0 ? 'bg-motriks' : 'bg-motriks/50')} style={{ width: `${Math.max(4, (p.revenue / maxProduct) * 100)}%` }} />
                                        </div>
                                        <span className="w-28 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                                            {fcfa(p.units)} {p.unit} · {p.share} %
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Meilleures hôtesses */}
                <div className="bg-white px-5 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Award className="size-4 text-slate-400" />
                        Meilleures hôtesses
                        <span className="font-normal text-slate-400">· {data.ranking_days} derniers jours</span>
                    </h3>
                    {data.best_hostesses.length === 0 ? (
                        <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">Aucun rapport soumis sur la période.</p>
                    ) : (
                        <ol className="mt-3 flex flex-col gap-3">
                            {data.best_hostesses.map((h, i) => (
                                <li key={h.id}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className={cn('w-4 shrink-0 text-xs font-semibold tabular-nums', i === 0 ? 'text-motriks-deep' : 'text-slate-400')}>{i + 1}</span>
                                            {/* Fiche du personnel : gérant et superviseur seulement */}
                                            {linkHostesses ? (
                                                <Link href={personnelShow({ personnel: h.uuid }).url} className="truncate font-medium text-ink hover:text-motriks-deep hover:underline">
                                                    {h.name}
                                                </Link>
                                            ) : (
                                                <span className="truncate font-medium text-ink">{h.name}</span>
                                            )}
                                        </span>
                                        <span className="shrink-0 font-semibold text-ink tabular-nums">
                                            {fcfa(h.revenue)} <span className="text-xs font-normal text-slate-400">FCFA</span>
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-3 pl-6">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div className={cn('h-full rounded-full', i === 0 ? 'bg-motriks' : 'bg-motriks/50')} style={{ width: `${Math.max(4, (h.revenue / maxHostess) * 100)}%` }} />
                                        </div>
                                        <span className="w-28 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                                            {h.days} jour{h.days > 1 ? 's' : ''} · {fcfa(h.units)} u.
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>

            {data.ranking_revenue > 0 && (
                <p className="flex items-center gap-1.5 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                    <TrendingUp className="size-3.5 text-motriks" />
                    {fcfa(data.ranking_revenue)} FCFA vendus sur ce site ces {data.ranking_days} derniers jours, boutiques extérieures comprises.
                </p>
            )}
        </section>
    );
}
