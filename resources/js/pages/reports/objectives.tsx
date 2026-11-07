import { Head, router } from '@inertiajs/react';
import { Calculator, CheckCircle2, Clock, Info, Search, Target, TrendingUp, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { WeeklyTargetsModal } from '@/components/weekly-targets-modal';
import { cn } from '@/lib/utils';
import { index as reportsIndex, objectives as reportsObjectives } from '@/routes/reports';
import { ReportTabs } from './report-tabs';
import { TargetsPanel, type Targets } from './targets-panel';
import { initials } from '@/lib/initials';

type Period = 'week' | 'month' | 'last_week' | 'last_month';
type Status = 'reached' | 'on_track' | 'behind' | 'none';

type Row = {
    user_id: number;
    name: string;
    sites: string[];
    target: number | null;
    source: 'fixed' | 'derived' | null;
    actual: number;
    projection: number;
    status: Status;
    history: { label: string; reached: boolean | null }[];
};

type Overview = {
    period: Period;
    scale: 'week' | 'month';
    start: string;
    end: string;
    current: boolean;
    elapsed_days: number;
    total_days: number;
    currency: string;
    summary: { hostesses: number; with_target: number; reached: number; on_track: number; behind: number; target_total: number; actual_total: number };
    rows: Row[];
};

type Props = { overview: Overview; targets: Targets; currency: string; canEditTargets: boolean };

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fmt = (n: number) => nf.format(Math.round(n));
const unit = (c: string) => (c === 'XAF' || c === 'XOF' ? 'FCFA' : c);

const STATUS: Record<Status, { label: string; badge: string; bar: string }> = {
    reached: { label: 'Atteint', badge: 'bg-motriks-soft text-motriks-deep ring-motriks/15', bar: 'bg-motriks' },
    on_track: { label: 'En bonne voie', badge: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300', bar: 'bg-sky-500' },
    behind: { label: 'En retard', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300', bar: 'bg-amber-400' },
    none: { label: 'Sans objectif', badge: 'bg-slate-100 text-slate-500 ring-slate-500/10 dark:bg-white/5', bar: 'bg-slate-300' },
};

function periodLabel(o: Overview): string {
    const a = new Date(`${o.start}T00:00:00`);
    const b = new Date(`${o.end}T00:00:00`);
    if (o.scale === 'month') return a.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const left = a.getMonth() === b.getMonth() ? String(a.getDate()) : a.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `Semaine du ${left} au ${b.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

function HostessRow({ row, rank, overview }: { row: Row; rank: number | null; overview: Overview }) {
    const cur = unit(overview.currency);
    const s = STATUS[row.status];
    const pct = row.target ? (row.actual / row.target) * 100 : 0;
    // Où l'hôtesse devrait en être à ce stade de la période
    const pace = overview.current ? Math.min(100, (overview.elapsed_days / overview.total_days) * 100) : null;
    const gap = row.target ? row.target - row.actual : 0;

    return (
        <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 px-4 py-4 sm:px-5 lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1.6fr)_auto]">
            <div className="flex items-center gap-3">
                <span className={cn('w-5 text-center text-xs font-semibold tabular-nums', rank === 1 ? 'text-amber-500' : 'text-slate-300')}>{rank ?? '–'}</span>
                <span className={cn('flex size-10 items-center justify-center rounded-full text-xs font-bold', row.status === 'reached' ? 'bg-motriks text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300')}>
                    {row.status === 'reached' ? <Trophy className="size-4" /> : initials(row.name)}
                </span>
            </div>

            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
                <p className="truncate text-xs text-slate-500">{row.sites.length ? row.sites.join(', ') : 'Sans point de vente'}</p>
            </div>

            <div className="col-span-2 min-w-0 lg:col-span-1">
                {row.target ? (
                    <>
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                            <span className="text-slate-600 tabular-nums dark:text-slate-300">
                                <span className="font-semibold text-ink">{fmt(row.actual)}</span> / {fmt(row.target)} {cur}
                                {row.source === 'derived' && (
                                    <span
                                        className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-px align-middle text-[10px] font-medium text-slate-500 dark:bg-white/5"
                                        title={overview.scale === 'month' ? 'Calculé depuis l’objectif de la semaine (× jours du mois ÷ 7)' : 'Calculé depuis l’objectif du mois (× 7 ÷ jours du mois)'}
                                    >
                                        <Calculator className="size-2.5" />
                                        calculé
                                    </span>
                                )}
                            </span>
                            <span className={cn('font-semibold tabular-nums', row.status === 'reached' ? 'text-motriks-deep' : 'text-slate-500')}>{Math.round(pct)} %</span>
                        </div>
                        <div className="relative mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                            <div className={cn('h-full rounded-full transition-[width] duration-500', s.bar)} style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }} />
                            {pace !== null && pace < 100 && <span aria-hidden title="Rythme attendu à ce jour" className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-slate-400/70" style={{ left: `calc(${pace}% - 1px)` }} />}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
                            {row.status === 'reached'
                                ? gap < 0
                                    ? `+${fmt(-gap)} ${cur} au-delà de l’objectif`
                                    : 'Objectif atteint'
                                : overview.current
                                  ? `Il manque ${fmt(gap)} ${cur} · projection ${fmt(row.projection)} ${cur}`
                                  : `Il a manqué ${fmt(gap)} ${cur}`}
                        </p>
                    </>
                ) : (
                    <p className="text-xs text-slate-400">
                        {fmt(row.actual)} {cur} vendus · pas d’objectif
                    </p>
                )}
            </div>

            <div className="col-span-2 flex items-center justify-between gap-3 lg:col-span-1 lg:justify-end">
                <div className="flex items-center gap-1" aria-label="Régularité sur les périodes précédentes">
                    {row.history.map((h) => (
                        <span
                            key={h.label}
                            title={`${h.label} : ${h.reached === null ? 'pas d’objectif' : h.reached ? 'atteint' : 'non atteint'}`}
                            className={cn('size-2.5 rounded-[3px]', h.reached === null ? 'bg-slate-100 dark:bg-white/5' : h.reached ? 'bg-motriks' : 'bg-amber-300')}
                        />
                    ))}
                </div>
                <span className={cn('inline-flex w-[104px] shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', s.badge)}>{s.label}</span>
            </div>
        </li>
    );
}

export default function ReportObjectives({ overview, targets, currency, canEditTargets }: Props) {
    const [filter, setFilter] = useState<Status | 'all'>('all');
    const [query, setQuery] = useState('');
    const [weekly, setWeekly] = useState(false);
    const [loading, setLoading] = useState(false);

    const cur = unit(overview.currency);
    const { summary } = overview;
    const teamPct = summary.target_total ? (summary.actual_total / summary.target_total) * 100 : 0;

    const changePeriod = (period: Period) =>
        router.get(reportsObjectives().url, { period }, { preserveState: true, preserveScroll: true, replace: true, only: ['overview'], onStart: () => setLoading(true), onFinish: () => setLoading(false) });

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return overview.rows.filter((r) => (filter === 'all' || r.status === filter) && (!q || `${r.name} ${r.sites.join(' ')}`.toLowerCase().includes(q)));
    }, [overview.rows, filter, query]);

    // Classement : rang parmi celles qui ont un objectif, dans l'ordre de réalisation
    const ranks = new Map(overview.rows.filter((r) => r.target).map((r, i) => [r.user_id, i + 1]));

    return (
        <>
            <Head title="Objectifs" />

            <Page
                title="Ventes & objectifs"
                description="Suivez qui atteint ses objectifs, semaine après semaine et mois après mois."
                className="max-w-6xl"
                actions={
                    canEditTargets && (
                        <ActionButton icon={<Target />} onClick={() => setWeekly(true)}>
                            Objectifs de la semaine
                        </ActionButton>
                    )
                }
            >
                <ReportTabs active="objectives" />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Segmented
                        label="Période"
                        value={overview.period}
                        onChange={changePeriod}
                        options={[
                            { value: 'week', label: 'Cette semaine' },
                            { value: 'month', label: 'Ce mois' },
                            { value: 'last_week', label: 'Semaine dernière' },
                            { value: 'last_month', label: 'Mois dernier' },
                        ]}
                    />
                    <p className={cn('text-sm text-slate-500 transition-opacity first-letter:uppercase', loading && 'opacity-50')}>
                        {periodLabel(overview)}
                        {overview.current && (
                            <span className="text-slate-400 tabular-nums">
                                {' '}
                                · jour {overview.elapsed_days} sur {overview.total_days}
                            </span>
                        )}
                    </p>
                </div>

                {summary.with_target === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                        <QuietEmpty
                            icon={Target}
                            title="Aucun objectif sur cette période"
                            action={
                                canEditTargets && (
                                    <ActionButton icon={<Target />} onClick={() => setWeekly(true)}>
                                        Fixer les objectifs de la semaine
                                    </ActionButton>
                                )
                            }
                        >
                            Fixez un objectif par semaine ou par mois : il reste en place ensuite, et l’autre échelle est calculée automatiquement.
                        </QuietEmpty>
                    </div>
                ) : (
                    <div className={cn('flex flex-col gap-6 transition-opacity', loading && 'opacity-60')}>
                        {/* Synthèse */}
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 dark:border-sidebar-border dark:bg-card">
                                <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <TrendingUp className="size-4 text-motriks" />
                                    Réalisation de l’équipe
                                </p>
                                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-ink tabular-nums">{Math.round(teamPct)} %</p>
                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div className="h-full rounded-full bg-gradient-to-r from-motriks to-emerald-400 transition-[width] duration-700" style={{ width: `${Math.min(100, teamPct)}%` }} />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 tabular-nums">
                                    <span className="font-semibold text-ink">{fmt(summary.actual_total)}</span> sur {fmt(summary.target_total)} {cur} visés par {summary.with_target} hôtesse{summary.with_target > 1 ? 's' : ''}
                                </p>
                            </section>

                            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-sidebar-border">
                                {(
                                    [
                                        { id: 'reached', label: 'Atteints', value: summary.reached, icon: CheckCircle2, tone: 'text-motriks-deep' },
                                        { id: 'on_track', label: 'En bonne voie', value: summary.on_track, icon: TrendingUp, tone: 'text-sky-600' },
                                        { id: 'behind', label: 'En retard', value: summary.behind, icon: Clock, tone: 'text-amber-600' },
                                    ] as const
                                ).map(({ id, label, value, icon: Icon, tone }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setFilter(filter === id ? 'all' : id)}
                                        aria-pressed={filter === id}
                                        className={cn('flex flex-col justify-between bg-white p-4 text-left transition-colors hover:bg-slate-50 sm:p-5 dark:bg-card dark:hover:bg-white/[0.02]', filter === id && 'bg-slate-50 dark:bg-white/[0.03]')}
                                    >
                                        <Icon className={cn('size-5', tone)} />
                                        <span className="mt-4">
                                            <span className="block text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</span>
                                            <span className="block text-xs leading-tight text-slate-500">{label}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Classement */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sidebar-border">
                                <Segmented
                                    label="Filtrer"
                                    value={filter}
                                    onChange={setFilter}
                                    options={[
                                        { value: 'all', label: 'Toutes', count: summary.hostesses },
                                        { value: 'reached', label: 'Atteints', count: summary.reached },
                                        { value: 'on_track', label: 'Bonne voie', count: summary.on_track },
                                        { value: 'behind', label: 'En retard', count: summary.behind },
                                        { value: 'none', label: 'Sans objectif', count: summary.hostesses - summary.with_target },
                                    ]}
                                />
                                <div className="sm:w-64">
                                    <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hôtesse ou point de vente" aria-label="Rechercher" className="h-9" />
                                </div>
                            </div>

                            {shown.length === 0 ? (
                                <QuietEmpty icon={Search} title="Aucune hôtesse ne correspond">
                                    Modifiez le filtre ou la recherche.
                                </QuietEmpty>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                    {shown.map((r) => (
                                        <HostessRow key={r.user_id} row={r} rank={ranks.get(r.user_id) ?? null} overview={overview} />
                                    ))}
                                </ul>
                            )}

                            <p className="flex items-start gap-2 border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500 dark:border-sidebar-border">
                                <Info className="mt-px size-3.5 shrink-0 text-slate-400" />
                                <span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Calculé</span> : quand seul l’objectif de la semaine est fixé, celui du mois en est déduit au prorata des jours (environ 4,3 semaines par mois), et inversement. Les carrés indiquent les{' '}
                                    {overview.scale === 'week' ? '4 semaines' : '4 mois'} précédents : vert atteint, orange manqué, gris sans objectif.
                                </span>
                            </p>
                        </section>
                    </div>
                )}

                {/* Réglage des objectifs du mois */}
                <TargetsPanel targets={targets} currency={currency} canEdit={canEditTargets} />
            </Page>

            {weekly && <WeeklyTargetsModal onClose={() => setWeekly(false)} />}
        </>
    );
}

ReportObjectives.layout = {
    breadcrumbs: [{ title: 'Ventes & objectifs', href: reportsIndex().url }, { title: 'Objectifs' }],
};
