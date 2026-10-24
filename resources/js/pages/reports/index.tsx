import { Head, router } from '@inertiajs/react';
import { CalendarRange, FileSpreadsheet, MapPin, Package, UserRound, Zap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { buttonClass } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { SelectInput, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { exportMethod as exportRoute, index as reportsIndex } from '@/routes/reports';
import { EvolutionChart, type TimelinePoint } from './evolution-chart';
import { day, money, number, signedPercent, variation } from './format';
import { MonthlyTable, type MonthRow } from './monthly-table';
import { TargetsPanel, type Targets } from './targets-panel';

// ── Types ─────────────────────────────────────────────────────────────

type Filters = {
    from: string;
    to: string;
    site_id: number | null;
    user_id: number | null;
    event_id: number | null;
};

type Option = { id: number; name: string };

type Group = { label: string; detail: string | null; revenue: number; units_sold: number; reports_count: number };

type Line = {
    report_id: number;
    report_date: string;
    site_name: string | null;
    hostess_name: string | null;
    event_name: string | null;
    product_name: string;
    unit: string | null;
    unit_price: string;
    units_sold: number;
    revenue: string;
};

type Props = {
    filters: Filters;
    options: { sites: Option[]; hostesses: Option[]; events: Option[] };
    currency: string;
    totals: {
        revenue: number;
        units_sold: number;
        reports_count: number;
        days_count: number;
        sites_count: number;
        hostesses_count: number;
    };
    byDay: Group[];
    bySite: Group[];
    byProduct: Group[];
    byHostess: Group[];
    lines: Line[];
    linesTruncated: boolean;
    previous: { from: string; to: string; totals: Props['totals'] };
    timeline: { granularity: string; points: TimelinePoint[] };
    monthly: MonthRow[];
    targets: Targets;
    canEditTargets: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Périodes rapides, calculées à la date du jour. */
function presets(): { label: string; from: string; to: string }[] {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const week = new Date(today);
    week.setDate(today.getDate() - 6);

    return [
        { label: 'Aujourd’hui', from: toIso(today), to: toIso(today) },
        { label: '7 derniers jours', from: toIso(week), to: toIso(today) },
        { label: 'Ce mois', from: toIso(new Date(y, m, 1)), to: toIso(today) },
        { label: 'Mois dernier', from: toIso(new Date(y, m - 1, 1)), to: toIso(new Date(y, m, 0)) },
        { label: 'Cette année', from: toIso(new Date(y, 0, 1)), to: toIso(today) },
    ];
}

/** Filtres sans les valeurs vides, pour des URL courtes. */
function query(f: Filters): Record<string, string | number> {
    return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null && v !== '')) as Record<string, string | number>;
}

// ── Ventilation (site, produit, hôtesse…) ─────────────────────────────

function Breakdown({ title, icon: Icon, items, currency, dates = false }: {
    title: string;
    icon: typeof MapPin;
    items: Group[];
    currency: string;
    dates?: boolean;
}) {
    const max = Math.max(...items.map((i) => i.revenue), 1);

    return (
        <Panel title={title}>
            {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Aucune vente sur la période.</p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {items.map((item) => (
                        <li key={item.label + (item.detail ?? '')} className="px-5 py-3">
                            <div className="flex items-baseline justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <Icon className="size-3.5 shrink-0 text-slate-300" />
                                    <span className="truncate text-sm font-medium text-ink">{dates ? day(item.label) : item.label}</span>
                                    {item.detail && <span className="hidden truncate text-xs text-slate-400 sm:inline">{item.detail}</span>}
                                </div>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{money(item.revenue, currency)}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-motriks" style={{ width: `${(item.revenue / max) * 100}%` }} />
                                </div>
                                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-400">
                                    {number.format(item.units_sold)} unité{item.units_sold > 1 ? 's' : ''}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ReportsIndex(props: Props) {
    const { options, currency, totals, lines, previous } = props;
    const [filters, setFilters] = useState<Filters>(props.filters);

    const apply = (next: Filters) => {
        setFilters(next);
        router.get(reportsIndex().url, query(next), { preserveState: true, preserveScroll: true, replace: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        apply(filters);
    };

    const set = (key: keyof Filters, value: string) =>
        apply({ ...filters, [key]: key === 'from' || key === 'to' ? value : value === '' ? null : Number(value) });

    const exportUrl = exportRoute({ query: query(props.filters) }).url;
    const hasSales = totals.reports_count > 0;
    const average = totals.days_count > 0 ? totals.revenue / totals.days_count : 0;
    const previousAverage = previous.totals.days_count > 0 ? previous.totals.revenue / previous.totals.days_count : 0;

    /** « +12 % vs période précédente », ou rien si la période précédente est vide. */
    const versus = (current: number, before: number) => {
        const v = variation(current, before);

        return v === null ? 'Pas de vente la période précédente' : `${signedPercent(v)} vs période précédente`;
    };
    const hasHistory = hasSales || previous.totals.reports_count > 0;

    return (
        <>
            <Head title="Rapports" />

            <Page
                title="Rapports"
                description="Ventes déclarées par vos hôtesses dans leurs rapports journaliers envoyés. Exportez-les en Excel pour votre comptabilité."
                actions={
                    <a href={exportUrl} className={buttonClass('primary', 'md')}>
                        <FileSpreadsheet className="size-4" />
                        Exporter en Excel
                    </a>
                }
            >
                {/* ── Filtres ── */}
                <Panel>
                    <form onSubmit={submit} className="flex flex-col gap-4 p-4 sm:p-5">
                        <div className="flex flex-wrap gap-2">
                            {presets().map((p) => {
                                const active = filters.from === p.from && filters.to === p.to;

                                return (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => apply({ ...filters, from: p.from, to: p.to })}
                                        className={cn(
                                            'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors',
                                            active
                                                ? 'bg-motriks-soft text-motriks-deep ring-green-200'
                                                : 'text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-ink',
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
                                Du
                                <TextInput type="date" icon={CalendarRange} value={filters.from} max={filters.to} onChange={(e) => set('from', e.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
                                Au
                                <TextInput type="date" icon={CalendarRange} value={filters.to} min={filters.from} onChange={(e) => set('to', e.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
                                Site
                                <SelectInput value={filters.site_id ?? ''} onChange={(e) => set('site_id', e.target.value)}>
                                    <option value="">Tous les sites</option>
                                    {options.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </SelectInput>
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
                                Hôtesse
                                <SelectInput value={filters.user_id ?? ''} onChange={(e) => set('user_id', e.target.value)}>
                                    <option value="">Toutes les hôtesses</option>
                                    {options.hostesses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </SelectInput>
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
                                Événement
                                <SelectInput value={filters.event_id ?? ''} onChange={(e) => set('event_id', e.target.value)}>
                                    <option value="">Tous</option>
                                    {options.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                </SelectInput>
                            </label>
                        </div>
                    </form>
                </Panel>

                {/* ── Chiffres clés ── */}
                <MetricStrip
                    items={[
                        { label: 'Chiffre d’affaires', value: money(totals.revenue, currency), sub: versus(totals.revenue, previous.totals.revenue) },
                        { label: 'Unités vendues', value: number.format(totals.units_sold), sub: versus(totals.units_sold, previous.totals.units_sold) },
                        { label: 'Rapports envoyés', value: number.format(totals.reports_count), sub: `${totals.sites_count} site${totals.sites_count > 1 ? 's' : ''} · ${totals.hostesses_count} hôtesse${totals.hostesses_count > 1 ? 's' : ''}` },
                        { label: 'Moyenne par jour d’activité', value: money(average, currency), sub: versus(average, previousAverage) },
                    ]}
                />

                <p className="-mt-3 text-xs text-slate-400">
                    Période précédente : du {day(previous.from)} au {day(previous.to)}.
                </p>

                <TargetsPanel targets={props.targets} currency={currency} canEdit={props.canEditTargets} />

                {hasHistory && (
                    <EvolutionChart
                        points={props.timeline.points}
                        granularity={props.timeline.granularity}
                        currency={currency}
                        totals={{ current: totals.revenue, previous: previous.totals.revenue }}
                    />
                )}

                {props.monthly.some((m) => m.revenue > 0) && <MonthlyTable rows={props.monthly} currency={currency} />}

                {!hasSales ? (
                    <Panel>
                        <EmptyState
                            icon={FileSpreadsheet}
                            title="Aucune vente sur cette période"
                            description="Les ventes apparaissent ici dès que vos hôtesses envoient leur rapport journalier. Essayez une autre période ou retirez des filtres."
                        />
                    </Panel>
                ) : (
                    <>
                        {/* ── Ventilations ── */}
                        <div className="grid gap-5 lg:grid-cols-2">
                            <Breakdown title="Par jour" icon={CalendarRange} items={props.byDay} currency={currency} dates />
                            <Breakdown title="Par site" icon={MapPin} items={props.bySite} currency={currency} />
                            <Breakdown title="Par produit" icon={Package} items={props.byProduct} currency={currency} />
                            <Breakdown title="Par hôtesse" icon={UserRound} items={props.byHostess} currency={currency} />
                        </div>

                        {/* ── Journal des ventes ── */}
                        <Panel
                            title="Journal des ventes"
                            description={props.linesTruncated
                                ? `Les ${lines.length} premières lignes ; l’export Excel contient tout.`
                                : 'Une ligne par produit vendu et par rapport.'}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                                            <th className="px-5 py-3">Date</th>
                                            <th className="px-3 py-3">Site</th>
                                            <th className="px-3 py-3">Hôtesse</th>
                                            <th className="px-3 py-3">Produit</th>
                                            <th className="px-3 py-3 text-right">Qté</th>
                                            <th className="px-3 py-3 text-right">Prix unit.</th>
                                            <th className="px-5 py-3 text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {lines.map((l, i) => (
                                            <tr key={`${l.report_id}-${i}`} className="hover:bg-slate-50/60">
                                                <td className="whitespace-nowrap px-5 py-2.5 text-slate-500">{day(l.report_date)}</td>
                                                <td className="px-3 py-2.5 text-ink">{l.site_name ?? '—'}</td>
                                                <td className="px-3 py-2.5 text-ink">{l.hostess_name ?? '—'}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className="text-ink">{l.product_name}</span>
                                                    {l.event_name && (
                                                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                                            <Zap className="size-3" />
                                                            {l.event_name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">{number.format(l.units_sold)}</td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-500">{money(l.unit_price, currency)}</td>
                                                <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums text-ink">{money(l.revenue, currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </>
                )}
            </Page>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Rapports', href: reportsIndex() }],
};
