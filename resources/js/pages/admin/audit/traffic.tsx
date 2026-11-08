import { Head, router } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, ChartLine, Minus, ShieldCheck, Table2 } from 'lucide-react';
import { useState } from 'react';
import { AuditTabs } from '@/components/admin/audit-tabs';
import {
    HoursChart,
    RankedList,
    SegmentedShare,
    SERIES,
    TrendChart,
    TrendLegend,
    type DailyPoint,
    type HourPoint,
    type RankedRow,
} from '@/components/admin/traffic-charts';
import { QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page, Panel } from '@/components/page/page';
import { cn } from '@/lib/utils';
import { number } from '@/pages/reports/format';
import { dashboard } from '@/routes/admin';
import { index as auditIndex } from '@/routes/admin/audit';
import { index as trafficIndex } from '@/routes/admin/traffic';

type Totals = { views: number; visits: number; pages_per_visit: number; mobile_share: number };

type Props = {
    period: number;
    periods: number[];
    tracking_since: string | null;
    live: number;
    totals: Totals;
    previous: Totals;
    daily: DailyPoint[];
    hours: HourPoint[];
    devices: { key: 'mobile' | 'tablet' | 'desktop'; label: string; visits: number }[];
    browsers: RankedRow[];
    systems: RankedRow[];
    pages: (RankedRow & { path: string })[];
    sources: RankedRow[];
    languages: RankedRow[];
    countries: RankedRow[];
};

const DEVICE_COLOR = { mobile: SERIES.green, desktop: SERIES.blue, tablet: SERIES.orange } as const;

/** Variation par rapport à la période précédente de même durée. */
function Delta({ current, previous, neutral = false, unit = '%' }: { current: number; previous: number; neutral?: boolean; unit?: '%' | 'pts' }) {
    if (previous === 0 && current === 0) return null;

    const diff = unit === 'pts' ? current - previous : previous === 0 ? null : (100 * (current - previous)) / previous;
    if (diff === null) {
        return <span className="text-xs font-medium text-slate-400">nouveau</span>;
    }

    const rounded = Math.round(diff * 10) / 10;
    const flat = Math.abs(rounded) < 0.5;
    const up = rounded > 0;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    const tone = flat || neutral ? 'bg-slate-100 text-slate-600' : up ? 'bg-motriks-soft text-motriks-deep' : 'bg-red-50 text-red-700';

    return (
        <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', tone)}>
            <Icon className="size-3" />
            {up && !flat ? '+' : ''}
            {flat ? '0' : number.format(Math.round(rounded))}
            {unit === 'pts' ? ' pt' : ' %'}
        </span>
    );
}

function Kpi({ label, value, hint, delta }: { label: string; value: string; hint: string; delta: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5 px-5 py-4 sm:px-6 sm:py-5">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            <span className="text-2xl font-semibold tracking-tight text-ink xl:text-[28px]">{value}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {delta}
                {hint}
            </span>
        </div>
    );
}

/** Données de la courbe en tableau (lecture d'écran, vérification des chiffres). */
function DailyTable({ points }: { points: DailyPoint[] }) {
    return (
        <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-xs text-slate-500">
                    <tr className="border-b border-slate-100">
                        <th className="px-5 py-2.5 text-left font-medium">Jour</th>
                        <th className="px-5 py-2.5 text-right font-medium">Visites</th>
                        <th className="px-5 py-2.5 text-right font-medium">Pages vues</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {[...points].reverse().map((p) => (
                        <tr key={p.date}>
                            <td className="px-5 py-2 text-slate-600">{p.long}</td>
                            <td className="px-5 py-2 text-right font-medium text-ink tabular-nums">{number.format(p.visits)}</td>
                            <td className="px-5 py-2 text-right text-slate-600 tabular-nums">{number.format(p.views)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminTraffic(props: Props) {
    const { period, periods, tracking_since, live, totals, previous, daily, hours, devices } = props;
    const [asTable, setAsTable] = useState(false);
    const span = `${period} jours précédents`;
    const peak = hours.reduce((best, h) => (h.views > best.views ? h : best), hours[0]);
    const hasData = totals.visits > 0;

    const setPeriod = (value: string) =>
        router.get(trafficIndex().url, { periode: value }, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <>
            <Head title="Trafic du site" />

            <Page
                title="Trafic du site"
                description="L’audience des pages publiques de Motriks : visites, appareils, provenance. Mesurée sans cookie, aucune adresse IP conservée."
            >
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <AuditTabs current="traffic" />
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="relative flex size-2">
                                    {live > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-motriks opacity-60" />}
                                    <span className={cn('relative inline-flex size-2 rounded-full', live > 0 ? 'bg-motriks' : 'bg-slate-300')} />
                                </span>
                                {live > 0
                                    ? `${number.format(live)} visiteur${live > 1 ? 's' : ''} ces 30 dernières minutes`
                                    : 'Personne ces 30 dernières minutes'}
                            </span>
                            <Segmented
                                label="Période"
                                value={String(period)}
                                onChange={setPeriod}
                                options={periods.map((p) => ({ value: String(p), label: `${p} jours` }))}
                            />
                        </div>
                    </div>

                    {!hasData ? (
                        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
                            <QuietEmpty
                                icon={ChartLine}
                                title={tracking_since ? `Aucune visite ces ${period} derniers jours` : 'Pas encore de visite enregistrée'}
                            >
                                {tracking_since
                                    ? `La mesure a commencé le ${tracking_since}. Choisissez une période plus longue.`
                                    : 'La mesure démarre avec la mise en ligne : chaque visite de l’accueil, du contact, des pages légales, de la connexion ou de l’inscription s’affichera ici.'}
                            </QuietEmpty>
                        </section>
                    ) : (
                        <>
                            {/* Chiffres clés, comparés à la période précédente de même durée */}
                            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] lg:grid-cols-4 lg:divide-y-0">
                                <Kpi
                                    label="Visites"
                                    value={number.format(totals.visits)}
                                    hint={`vs ${span}`}
                                    delta={<Delta current={totals.visits} previous={previous.visits} />}
                                />
                                <Kpi
                                    label="Pages vues"
                                    value={number.format(totals.views)}
                                    hint={`vs ${span}`}
                                    delta={<Delta current={totals.views} previous={previous.views} />}
                                />
                                <Kpi
                                    label="Pages par visite"
                                    value={totals.pages_per_visit.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    hint={`vs ${span}`}
                                    delta={<Delta current={totals.pages_per_visit} previous={previous.pages_per_visit} />}
                                />
                                <Kpi
                                    label="Part mobile"
                                    value={`${Math.round(totals.mobile_share)} %`}
                                    hint="des visites"
                                    delta={<Delta current={totals.mobile_share} previous={previous.mobile_share} neutral unit="pts" />}
                                />
                            </div>

                            <Panel
                                title="Visites et pages vues"
                                description={`Par jour, sur les ${period} derniers jours.`}
                                actions={
                                    <button
                                        type="button"
                                        onClick={() => setAsTable((v) => !v)}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
                                        aria-pressed={asTable}
                                    >
                                        {asTable ? <ChartLine className="size-3.5" /> : <Table2 className="size-3.5" />}
                                        {asTable ? 'Courbe' : 'Tableau'}
                                    </button>
                                }
                            >
                                {asTable ? (
                                    <DailyTable points={daily} />
                                ) : (
                                    <div className="flex flex-col gap-3 p-4 sm:p-5">
                                        <TrendLegend visits={totals.visits} views={totals.views} />
                                        <TrendChart points={daily} />
                                    </div>
                                )}
                            </Panel>

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                                <Panel title="Appareils" description="Part des visites.">
                                    <div className="p-5">
                                        <SegmentedShare parts={devices.map((d) => ({ ...d, color: DEVICE_COLOR[d.key] }))} />
                                    </div>
                                </Panel>
                                <Panel
                                    title="Heures de visite"
                                    description={
                                        peak.views > 0
                                            ? `Pages vues par heure. Pic entre ${peak.hour} h et ${peak.hour + 1} h.`
                                            : 'Pages vues par heure.'
                                    }
                                >
                                    <div className="p-4 sm:p-5">
                                        <HoursChart hours={hours} />
                                    </div>
                                </Panel>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <Panel title="Pages les plus vues" description="Classées par visites.">
                                    <RankedList
                                        rows={props.pages.map((p) => ({ ...p, hint: p.label !== p.path ? p.path : undefined }))}
                                        empty="Aucune page vue."
                                    />
                                </Panel>
                                <Panel title="Provenance" description="Moteur de recherche, réseau social, lien partagé ou accès direct.">
                                    <RankedList rows={props.sources} empty="Aucune provenance connue." />
                                </Panel>
                                <Panel title="Navigateurs">
                                    <RankedList rows={props.browsers} empty="Aucun navigateur reconnu." />
                                </Panel>
                                <Panel title="Systèmes">
                                    <RankedList rows={props.systems} empty="Aucun système reconnu." />
                                </Panel>
                                <Panel title="Langues" description="Langue principale du navigateur.">
                                    <RankedList rows={props.languages} empty="Aucune langue transmise." />
                                </Panel>
                                <Panel title="Pays">
                                    <RankedList
                                        rows={props.countries}
                                        empty="Le pays s’affiche lorsque le site est servi par Cloudflare (en-tête CF-IPCountry) : aucune géolocalisation n’est faite à partir de l’adresse IP."
                                    />
                                </Panel>
                            </div>
                        </>
                    )}

                    <p className="flex items-start gap-2 text-xs text-slate-400">
                        <ShieldCheck className="mt-px size-3.5 shrink-0" />
                        <span>
                            Une visite correspond à un visiteur sur une journée. Le visiteur est une empreinte anonyme renouvelée chaque jour : ni
                            cookie, ni adresse IP conservée, ni suivi d’un jour à l’autre. Robots, préchargements et comptes administrateur sont
                            exclus. Données gardées 13 mois
                            {tracking_since ? ` · mesure depuis le ${tracking_since}` : ''}.
                        </span>
                    </p>
                </div>
            </Page>
        </>
    );
}

AdminTraffic.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Journal d’audit', href: auditIndex().url },
        { title: 'Trafic du site', href: trafficIndex().url },
    ],
};
