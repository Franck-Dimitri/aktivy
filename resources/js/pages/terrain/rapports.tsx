import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, ExternalLink, Pencil, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActionLink } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { Modal } from '@/components/page/modal';
import { Page } from '@/components/page/page';
import { ProductImage } from '@/components/page/product-image';
import { StatStrip } from '@/components/page/stat-strip';
import { cn } from '@/lib/utils';
import { index as terrainReports } from '@/routes/terrain/reports';
import { show as reportShow } from '@/routes/terrain/report';

/* ─────────────────────── Types ─────────────────────── */

type ReportLine = {
    id: number;
    product_name: string;
    unit: string;
    unit_price: number;
    opening_stock: number;
    units_sold: number;
    closing_stock: number;
    revenue: number;
    image_url: string | null;
};

type Report = {
    id: number;
    visit_id: number;
    site_name: string;
    report_date: string;
    report_date_iso: string;
    status: 'draft' | 'submitted';
    total_revenue: number;
    total_units_sold: number;
    submitted_at: string | null;
    has_incident: boolean;
    notes: string | null;
    incident_notes: string | null;
    lines: ReportLine[];
};

type StatusFilter = 'all' | 'submitted' | 'draft';

/** La recherche n'apparaît qu'à partir de ce nombre de rapports. */
const SEARCH_MIN = 6;
/** En dessous de ce nombre, le dernier rapport est détaillé en grand. */
const FEATURED_MAX = 3;

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

function monthKey(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function groupByMonth(reports: Report[]): [string, Report[]][] {
    const map = new Map<string, Report[]>();
    for (const r of reports) {
        const k = monthKey(r.report_date_iso);
        map.set(k, [...(map.get(k) ?? []), r]);
    }
    return Array.from(map.entries());
}

/** Minuscules sans accents : « fevrier » trouve « février ». */
function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function shortDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Produits vendus, du plus rentable au moins rentable. */
function soldLines(report: Report): ReportLine[] {
    return report.lines.filter((l) => l.units_sold > 0).sort((x, y) => y.revenue - x.revenue);
}

/** « buillie kalis's et 2 autres » : résumé lisible des produits vendus. */
function productSummary(report: Report): string {
    const [first, ...rest] = soldLines(report);
    if (!first) return 'Aucune vente';
    return rest.length > 0 ? `${first.product_name} et ${rest.length} autre${rest.length > 1 ? 's' : ''}` : first.product_name;
}

/** Tout ce qui est cherchable dans un rapport : site, date, mois, statut, montant. */
function searchableText(r: Report): string {
    return normalize(
        [
            r.site_name,
            r.report_date,
            monthKey(r.report_date_iso),
            r.report_date_iso,
            r.status === 'submitted' ? 'soumis' : 'brouillon',
            r.has_incident ? 'incident' : '',
            String(r.total_revenue),
            r.lines.map((l) => l.product_name).join(' '),
        ].join(' '),
    );
}

/* ─────────────────────── Modal d'aperçu ─────────────────────── */

function ReportModal({ report, onClose }: { report: Report; onClose: () => void }) {
    const sold = report.lines.filter((l) => l.units_sold > 0);

    return (
        <Modal onClose={onClose} title={report.site_name} description={report.report_date} size="lg" icon={<ClipboardCheck />}>
            <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6">
                <div className="flex flex-col gap-5">
                    {/* Total */}
                    <div className="flex items-center gap-4 rounded-2xl bg-aktivy-soft p-5 ring-1 ring-green-200/60">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-aktivy text-white shadow-sm shadow-green-600/25">
                            <CheckCircle2 className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-green-800/80">Chiffre d'affaires</p>
                            <p className="text-2xl font-semibold tracking-tight text-aktivy-deep tabular-nums">
                                {formatMoney(report.total_revenue)}
                                <span className="ml-1.5 text-sm font-medium text-green-700/70">FCFA</span>
                            </p>
                            <p className="mt-0.5 text-xs text-green-800/80">
                                {report.total_units_sold} unité{report.total_units_sold > 1 ? 's' : ''} vendue{report.total_units_sold > 1 ? 's' : ''}
                                {report.submitted_at && `, soumis à ${report.submitted_at}`}
                            </p>
                        </div>
                    </div>

                    {/* Produits vendus */}
                    <div>
                        <p className="mb-2.5 text-sm font-semibold text-ink">
                            Produits vendus
                            <span className="ml-2 font-normal text-slate-400">{sold.length}</span>
                        </p>
                        {sold.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                                Aucune vente enregistrée ce jour.
                            </p>
                        ) : (
                            <ul className="grid gap-2.5">
                                {sold.map((l) => (
                                    <li key={l.id} className="flex items-center gap-4 rounded-2xl p-2.5 ring-1 ring-slate-200/70">
                                        <ProductImage src={l.image_url} alt={l.product_name} className="size-14" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink">{l.product_name}</p>
                                            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                                {l.units_sold} × {formatMoney(l.unit_price)} FCFA
                                            </p>
                                            <p className="text-xs text-slate-400 tabular-nums">
                                                Stock {l.opening_stock} → {l.closing_stock}
                                            </p>
                                        </div>
                                        <p className="shrink-0 pr-1 text-sm font-bold text-aktivy-deep tabular-nums">{formatMoney(l.revenue)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {report.notes && (
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <p className="text-xs font-medium text-slate-400">Notes du jour</p>
                            <p className="mt-1 text-sm leading-relaxed text-ink">{report.notes}</p>
                        </div>
                    )}

                    {report.incident_notes && (
                        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/70">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                <AlertTriangle className="size-3.5" />
                                Incident signalé
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-amber-900">{report.incident_notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-10 rounded-xl px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                >
                    Fermer
                </button>
                <ActionLink href={reportShow({ visit: report.visit_id }).url} icon={<ExternalLink />} className="h-10 rounded-xl">
                    Ouvrir le rapport
                </ActionLink>
            </footer>
        </Modal>
    );
}

/* ─────────────────────── Dernier rapport en grand ─────────────────────── */

function FeaturedReport({ report }: { report: Report }) {
    const sold = soldLines(report);

    return (
        <section className={cn(card, 'overflow-hidden')}>
            <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-slate-100 px-6 py-5">
                <div className="flex min-w-0 items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-aktivy-soft text-aktivy-deep ring-1 ring-green-600/10 ring-inset">
                        <ClipboardCheck className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">Dernier rapport</p>
                        <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{report.site_name}</h2>
                        <p className="text-sm text-slate-500 capitalize">
                            {report.report_date}
                            {report.submitted_at && <span className="normal-case">, soumis à {report.submitted_at}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <div className="text-right">
                        <p className="text-2xl font-semibold tracking-tight text-aktivy-deep tabular-nums">
                            {formatMoney(report.total_revenue)}
                            <span className="ml-1.5 text-sm font-medium text-slate-400">FCFA</span>
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                            {report.total_units_sold} unité{report.total_units_sold > 1 ? 's' : ''} vendue{report.total_units_sold > 1 ? 's' : ''}
                        </p>
                    </div>
                    <ActionLink href={reportShow({ visit: report.visit_id }).url} icon={<ExternalLink />} className="h-10 rounded-xl">
                        Ouvrir
                    </ActionLink>
                </div>
            </header>

            <div className="px-6 py-5">
                <p className="mb-3 text-sm font-semibold text-ink">
                    Produits vendus
                    <span className="ml-2 font-normal text-slate-400">{sold.length}</span>
                </p>
                {sold.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                        Aucune vente enregistrée ce jour.
                    </p>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {sold.map((l) => (
                            <li key={l.id} className="flex items-center gap-4 rounded-2xl p-3 ring-1 ring-slate-200/70">
                                <ProductImage src={l.image_url} alt={l.product_name} className="size-16" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{l.product_name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                        {l.units_sold} × {formatMoney(l.unit_price)} FCFA
                                    </p>
                                    <p className="text-xs text-slate-400 tabular-nums">
                                        Stock {l.opening_stock} → {l.closing_stock}
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-aktivy-deep tabular-nums">{formatMoney(l.revenue)} FCFA</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {(report.notes || report.incident_notes) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {report.notes && (
                            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                <p className="text-xs font-medium text-slate-400">Notes du jour</p>
                                <p className="mt-1 text-sm leading-relaxed text-ink">{report.notes}</p>
                            </div>
                        )}
                        {report.incident_notes && (
                            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/70">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                    <AlertTriangle className="size-3.5" />
                                    Incident signalé
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-amber-900">{report.incident_notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ─────────────────────── Ligne de rapport ─────────────────────── */

function ReportRow({ report, maxRevenue, showBar, onOpen }: { report: Report; maxRevenue: number; showBar: boolean; onOpen: () => void }) {
    const submitted = report.status === 'submitted';
    const date = new Date(report.report_date_iso + 'T00:00:00');
    const pct = maxRevenue > 0 ? Math.round((report.total_revenue / maxRevenue) * 100) : 0;
    const sold = soldLines(report);

    const rowClass =
        'group relative flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-green-50/40 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none focus-visible:ring-inset';

    const content = (
        <>
            <div
                className={cn(
                    'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-center ring-1 ring-inset',
                    submitted ? 'bg-aktivy-soft text-aktivy-deep ring-green-600/10' : 'bg-amber-50 text-amber-700 ring-amber-200/70',
                )}
            >
                <span className="text-sm leading-none font-bold">{String(date.getDate()).padStart(2, '0')}</span>
                <span className="mt-1 text-[10px] leading-none capitalize opacity-80">
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{report.site_name}</p>
                    {report.has_incident && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-label="Incident signalé" />}
                    {!submitted && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
                            Brouillon
                        </span>
                    )}
                </div>
                {submitted ? (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span className="truncate">{productSummary(report)}</span>
                        {report.submitted_at && <span className="text-slate-400">Soumis à {report.submitted_at}</span>}
                    </p>
                ) : (
                    <p className="mt-0.5 text-xs text-amber-600">À compléter et à soumettre</p>
                )}
            </div>

            {submitted && sold.length > 0 && (
                <div className="hidden -space-x-3 md:flex" aria-hidden="true">
                    {sold.slice(0, 3).map((l) => (
                        <ProductImage key={l.id} src={l.image_url} alt="" className="size-10 rounded-xl bg-white ring-2 ring-white" />
                    ))}
                </div>
            )}

            {submitted && (
                <div className="shrink-0 text-right">
                    <p className={cn('text-sm font-bold tabular-nums', report.total_revenue > 0 ? 'text-aktivy-deep' : 'text-slate-300')}>
                        {formatMoney(report.total_revenue)}
                        <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                        {report.total_units_sold} unité{report.total_units_sold > 1 ? 's' : ''}
                    </p>
                </div>
            )}

            <span
                aria-hidden="true"
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    submitted
                        ? 'bg-slate-50 text-slate-400 group-hover:bg-aktivy-soft group-hover:text-aktivy-deep'
                        : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
                )}
            >
                {submitted ? <ChevronRight className="size-4" /> : <Pencil className="size-4" />}
            </span>
        </>
    );

    return (
        <li className="relative overflow-hidden">
            {/* Proportion du CA : seulement quand il y a de quoi comparer (au moins 2 rapports dans le mois) */}
            {showBar && submitted && report.total_revenue > 0 && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 bg-aktivy/[0.04] transition-[width] duration-700 motion-reduce:transition-none"
                    style={{ width: `${pct}%` }}
                />
            )}

            {submitted ? (
                <button type="button" onClick={onOpen} className={rowClass} aria-label={`Voir le rapport du ${report.report_date}`}>
                    {content}
                </button>
            ) : (
                <Link href={reportShow({ visit: report.visit_id }).url} className={rowClass}>
                    {content}
                </Link>
            )}
        </li>
    );
}

/* ─────────────────────── Page ─────────────────────── */

export default function TerrainRapports({ reports }: { reports: Report[] }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<Report | null>(null);

    const submitted = useMemo(
        () => reports.filter((r) => r.status === 'submitted').sort((a, b) => b.report_date_iso.localeCompare(a.report_date_iso)),
        [reports],
    );
    const drafts = reports.length - submitted.length;
    const totalRevenue = submitted.reduce((s, r) => s + r.total_revenue, 0);
    const totalUnits = submitted.reduce((s, r) => s + r.total_units_sold, 0);
    const best = submitted.reduce<Report | null>((acc, r) => (acc === null || r.total_revenue > acc.total_revenue ? r : acc), null);
    const last = submitted[0] ?? null;

    // Index de recherche calculé une seule fois
    const index = useMemo(() => reports.map((r) => ({ report: r, text: searchableText(r) })), [reports]);

    // Recherche instantanée : chaque mot saisi doit être présent, dans n'importe quel ordre
    const filtered = useMemo(() => {
        const terms = normalize(search).split(/\s+/).filter(Boolean);
        return index
            .filter(({ report, text }) => (status === 'all' || report.status === status) && terms.every((t) => text.includes(t)))
            .map(({ report }) => report);
    }, [index, search, status]);

    const showSearch = reports.length >= SEARCH_MIN;
    const showTabs = drafts > 0;
    const searching = search.trim().length > 0 || status !== 'all';

    // Peu de rapports : le dernier est détaillé en grand, la liste ne le répète pas
    const featured = reports.length <= FEATURED_MAX && !searching ? last : null;
    const listReports = featured ? filtered.filter((r) => r.id !== featured.id) : filtered;
    const grouped = groupByMonth(listReports);

    const tabs: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Tous', count: reports.length },
        { key: 'submitted', label: 'Soumis', count: submitted.length },
        { key: 'draft', label: 'Brouillons', count: drafts },
    ];

    // 4e chiffre : « Dernier rapport » tant qu'il n'y a rien à comparer, « Meilleure journée » ensuite
    const fourth =
        submitted.length >= 2 && best
            ? { label: 'Meilleure journée', value: <Money amount={best.total_revenue} />, sub: best.report_date }
            : last
              ? { label: 'Dernier rapport', value: shortDate(last.report_date_iso), sub: last.site_name }
              : { label: 'Dernier rapport', value: '–', sub: 'aucun rapport soumis' };

    return (
        <>
            <Head title="Mes rapports" />

            <Page title="Mes rapports" description={`${reports.length} rapport${reports.length > 1 ? 's' : ''} dans l'historique`}>
                {reports.length === 0 ? (
                    <div className={cn(card, 'p-10 sm:p-16')}>
                        <EmptyState
                            icon={ClipboardList}
                            title="Aucun rapport"
                            description="Vos rapports journaliers apparaîtront ici une fois soumis."
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <StatStrip
                            items={[
                                {
                                    label: 'Rapports soumis',
                                    value: submitted.length,
                                    sub: drafts > 0 ? `${drafts} brouillon${drafts > 1 ? 's' : ''} en attente` : 'aucun brouillon',
                                },
                                { label: "Chiffre d'affaires", value: <Money amount={totalRevenue} />, sub: 'rapports soumis' },
                                { label: 'Unités vendues', value: totalUnits, sub: 'rapports soumis' },
                                fourth,
                            ]}
                        />

                        {(showSearch || showTabs) && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {showSearch ? (
                                    <div className="relative w-full sm:max-w-sm">
                                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
                                            placeholder="Site, date, mois, produit…"
                                            aria-label="Rechercher un rapport"
                                            autoComplete="off"
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-10 text-sm text-ink transition-colors outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:ring-2 focus:ring-aktivy/20 [&::-webkit-search-cancel-button]:hidden"
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={() => setSearch('')}
                                                aria-label="Effacer la recherche"
                                                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <span />
                                )}

                                {showTabs && (
                                    <div role="tablist" aria-label="Statut" className="inline-flex w-fit gap-1 rounded-2xl bg-slate-100/80 p-1">
                                        {tabs.map((t) => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                role="tab"
                                                aria-selected={status === t.key}
                                                onClick={() => setStatus(t.key)}
                                                className={cn(
                                                    'flex h-8 items-center gap-2 rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                                    status === t.key ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                                                )}
                                            >
                                                {t.label}
                                                <span
                                                    className={cn(
                                                        'rounded-full px-1.5 text-xs font-semibold tabular-nums',
                                                        status === t.key ? 'bg-aktivy-soft text-aktivy-deep' : 'text-slate-400',
                                                    )}
                                                >
                                                    {t.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {searching && filtered.length > 0 && (
                            <p className="px-1 text-xs text-slate-500" aria-live="polite">
                                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                            </p>
                        )}

                        {searching && filtered.length === 0 && (
                            <div className={cn(card, 'p-12')}>
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description="Essayez un autre mot, un mois ou un nom de site."
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                setStatus('all');
                                            }}
                                            className="h-9 rounded-xl bg-aktivy-soft px-4 text-sm font-semibold text-aktivy-deep ring-1 ring-green-200/70 transition-colors hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                        >
                                            Réinitialiser
                                        </button>
                                    }
                                />
                            </div>
                        )}

                        {featured && <FeaturedReport report={featured} />}

                        {featured && listReports.length > 0 && <h2 className="mt-2 px-1 text-sm font-semibold text-ink">Historique</h2>}

                        {grouped.map(([month, monthReports]) => {
                            const monthSubmitted = monthReports.filter((r) => r.status === 'submitted');
                            const monthRevenue = monthSubmitted.reduce((s, r) => s + r.total_revenue, 0);
                            const monthUnits = monthSubmitted.reduce((s, r) => s + r.total_units_sold, 0);
                            const maxRevenue = Math.max(...monthSubmitted.map((r) => r.total_revenue), 1);

                            return (
                                <section key={month} className="flex flex-col gap-2">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-1">
                                        <h3 className="text-sm font-medium text-slate-500 capitalize">{month}</h3>
                                        {monthRevenue > 0 ? (
                                            <p className="text-xs text-slate-500 tabular-nums">
                                                <span className="font-semibold text-aktivy-deep">{formatMoney(monthRevenue)} FCFA</span>
                                                <span className="ml-3">
                                                    {monthUnits} unité{monthUnits > 1 ? 's' : ''}
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-400">
                                                {monthReports.length} rapport{monthReports.length > 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>

                                    <div className={cn(card, 'overflow-hidden')}>
                                        <ul className="divide-y divide-slate-100">
                                            {monthReports.map((r) => (
                                                <ReportRow
                                                    key={r.id}
                                                    report={r}
                                                    maxRevenue={maxRevenue}
                                                    showBar={monthSubmitted.length > 1}
                                                    onOpen={() => setSelected(r)}
                                                />
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </Page>

            {selected && <ReportModal report={selected} onClose={() => setSelected(null)} />}
        </>
    );
}

TerrainRapports.layout = {
    breadcrumbs: [{ title: 'Mes rapports', href: terrainReports().url }],
};