import { Head } from '@inertiajs/react';
import { CalendarRange, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Modal } from '@/components/page/modal';
import { Page } from '@/components/page/page';
import { StatStrip } from '@/components/page/stat-strip';
import { cn } from '@/lib/utils';
import { planning as terrainPlanning } from '@/routes/terrain';

/* ─────────────────────── Types ─────────────────────── */

type Visit = {
    id: number;
    date: string;
    checked_in_at: string;
    checked_out_at: string | null;
    duration_minutes: number | null;
    status: string;
};

type Affectation = {
    id: number;
    site_name: string;
    site_city: string;
    site_type: string;
    site_address: string | null;
    starts_on: string;
    ends_on: string | null;
    slot_start: string | null;
    slot_end: string | null;
    is_active: boolean;
};

type PeriodStats = {
    visits: number;
    total_minutes: number;
    reports: number;
};

type Props = {
    upcoming: Affectation[];
    visits: Visit[];
    stats: { week: PeriodStats; month: PeriodStats; year: PeriodStats };
};

type Period = 'week' | 'month' | 'year';

/* ─────────────────────── Helpers ─────────────────────── */

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const periodLabel: Record<Period, string> = {
    week: 'cette semaine',
    month: 'ce mois',
    year: 'cette année',
};

/** Date locale au format AAAA-MM-JJ (toISOString donnerait la date UTC, parfois décalée d'un jour). */
function localISO(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

function shortDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function longDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const card = 'rounded-2xl border border-slate-200/80 bg-white';

/* ─────────────────────── Calendrier ─────────────────────── */

type CalDay = {
    day: number;
    date: string;
    worked: boolean;
    inProgress: boolean;
    isToday: boolean;
    isFuture: boolean;
    duration: number | null;
};

function MonthCalendar({
    year,
    month,
    visits,
    onPrev,
    onNext,
    onToday,
    isCurrentMonth,
}: {
    year: number;
    month: number;
    visits: Visit[];
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    isCurrentMonth: boolean;
}) {
    const today = localISO();

    const visitMap = useMemo(() => {
        const map: Record<string, { duration: number | null; inProgress: boolean }> = {};
        for (const v of visits) map[v.date] = { duration: v.duration_minutes, inProgress: v.status === 'in_progress' };
        return map;
    }, [visits]);

    const cells = useMemo<(CalDay | null)[]>(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = (new Date(year, month, 1).getDay() + 6) % 7; // semaine commençant le lundi
        const list: (CalDay | null)[] = Array(offset).fill(null);

        for (let d = 1; d <= daysInMonth; d++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const v = visitMap[date];
            list.push({
                day: d,
                date,
                worked: !!v,
                inProgress: v?.inProgress ?? false,
                isToday: date === today,
                isFuture: date > today,
                duration: v?.duration ?? null,
            });
        }
        return list;
    }, [year, month, visitMap, today]);

    const rows = Math.ceil(cells.length / 7);
    const worked = cells.filter((c) => c?.worked).length;
    const elapsed = cells.filter((c) => c && !c.isFuture).length;

    return (
        <section className={cn(card, 'flex flex-col p-6 sm:p-7')}>
            <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-tight text-ink">
                        {MONTH_NAMES[month]} {year}
                    </h2>
                    {elapsed > 0 && (
                        <span className="inline-flex items-center rounded-full bg-aktivy-soft px-2.5 py-0.5 text-xs font-semibold text-aktivy-deep ring-1 ring-green-200/70 tabular-nums">
                            {worked}/{elapsed} jours
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {!isCurrentMonth && (
                        <button
                            type="button"
                            onClick={onToday}
                            className="mr-1 h-8 rounded-lg px-2.5 text-xs font-semibold text-aktivy-deep transition-colors hover:bg-aktivy-soft focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            Aujourd'hui
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onPrev}
                        aria-label="Mois précédent"
                        className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        aria-label="Mois suivant"
                        className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </header>

            <div className="mt-6 grid grid-cols-7 gap-2">
                {DAY_NAMES.map((d) => (
                    <div key={d} className="pb-1 text-center text-xs font-medium text-slate-400">
                        {d}
                    </div>
                ))}
            </div>

            {/* Les lignes se partagent toute la hauteur disponible : le calendrier va jusqu'en bas de la carte */}
            <div
                className="mt-1 grid min-h-0 flex-1 grid-cols-7 gap-2"
                style={{ gridTemplateRows: `repeat(${rows}, minmax(3rem, 1fr))` }}
            >
                {cells.map((c, i) =>
                    c ? (
                        <div
                            key={c.date}
                            title={c.worked ? `${longDate(c.date)}${c.duration ? ` · ${formatDuration(c.duration)}` : ''}` : undefined}
                            className={cn(
                                'relative flex flex-col justify-between rounded-2xl p-2.5 text-sm font-medium tabular-nums transition-colors',
                                c.worked
                                    ? 'bg-aktivy text-white shadow-sm shadow-green-600/20'
                                    : c.isToday
                                      ? 'bg-aktivy-soft text-aktivy-deep ring-1 ring-green-300'
                                      : c.isFuture
                                        ? 'text-slate-300'
                                        : 'bg-slate-50/70 text-slate-500',
                                c.isToday && c.worked && 'ring-2 ring-aktivy ring-offset-2',
                            )}
                        >
                            <span className={cn('leading-none', c.isToday && 'font-bold')}>{c.day}</span>
                            {c.worked && (
                                <span className="text-[11px] leading-none font-semibold text-white/85">
                                    {c.inProgress ? 'En cours' : c.duration ? formatDuration(c.duration) : ''}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div key={`empty-${i}`} />
                    ),
                )}
            </div>
        </section>
    );
}

/* ─────────────────────── Éléments de liste ─────────────────────── */

function AffectationItem({ a, detailed = false }: { a: Affectation; detailed?: boolean }) {
    return (
        <li className="flex items-start gap-3.5">
            <span
                className={cn(
                    'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl',
                    a.is_active ? 'bg-aktivy text-white shadow-sm shadow-green-600/20' : 'bg-slate-100 text-slate-400',
                )}
            >
                <MapPin className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{a.site_name}</p>
                    {a.is_active && (
                        <span className="shrink-0 rounded-full bg-aktivy-soft px-2 py-0.5 text-[10px] font-semibold text-aktivy-deep ring-1 ring-green-200/70">
                            Actif
                        </span>
                    )}
                </div>
                <p className="truncate text-xs text-slate-500">
                    {a.site_type}, {a.site_city}
                </p>
                {detailed && a.site_address && <p className="truncate text-xs text-slate-400">{a.site_address}</p>}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span>
                        {shortDate(a.starts_on)} → {a.ends_on ? shortDate(a.ends_on) : 'sans fin'}
                    </span>
                    {(a.slot_start || a.slot_end) && (
                        <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {a.slot_start ?? '?'} → {a.slot_end ?? '?'}
                        </span>
                    )}
                </p>
            </div>
        </li>
    );
}

function PresenceItem({ v, today, detailed = false }: { v: Visit; today: string; detailed?: boolean }) {
    const d = new Date(v.date + 'T00:00:00');
    const isToday = v.date === today;

    return (
        <li className="flex items-center gap-3.5">
            <div
                className={cn(
                    'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-center',
                    isToday ? 'bg-aktivy text-white shadow-sm shadow-green-600/20' : 'bg-green-50 text-aktivy-deep ring-1 ring-green-600/10 ring-inset',
                )}
            >
                <span className="text-sm leading-none font-bold">{String(d.getDate()).padStart(2, '0')}</span>
                <span className={cn('mt-1 text-[10px] leading-none capitalize', isToday ? 'text-green-100' : 'text-slate-400')}>
                    {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                </span>
            </div>
            <div className="min-w-0 flex-1">
                {detailed && <p className="truncate text-sm font-semibold text-ink capitalize">{longDate(v.date)}</p>}
                <p className={cn('truncate tabular-nums', detailed ? 'text-xs text-slate-500' : 'text-sm font-medium text-ink')}>
                    {v.checked_in_at}
                    {v.checked_out_at && ` → ${v.checked_out_at}`}
                </p>
                {v.status === 'in_progress' && <p className="text-xs font-semibold text-aktivy-deep">En cours</p>}
            </div>
            {v.duration_minutes ? (
                <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">{formatDuration(v.duration_minutes)}</p>
            ) : null}
        </li>
    );
}

function SeeAll({ count, onClick }: { count: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="mt-auto inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 text-sm font-medium text-slate-600 ring-1 ring-slate-200/70 transition-colors hover:bg-aktivy-soft hover:text-aktivy-deep hover:ring-green-200 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
        >
            Voir tout ({count})
            <ChevronRight className="size-4" />
        </button>
    );
}

/* ─────────────────────── Page ─────────────────────── */

export default function TerrainPlanning({ upcoming, visits, stats }: Props) {
    const now = new Date();
    const [period, setPeriod] = useState<Period>('month');
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [modal, setModal] = useState<'affectations' | 'presences' | null>(null);

    const current = stats[period];
    const today = localISO();
    const avg = current.visits > 0 ? Math.round(current.total_minutes / current.visits) : 0;
    const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();

    // Affectations : l'active d'abord, puis les plus récentes
    const sortedAffectations = useMemo(
        () => [...upcoming].sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.starts_on.localeCompare(a.starts_on)),
        [upcoming],
    );
    const recentAffectations = sortedAffectations.slice(0, 2);
    const recentVisits = visits.slice(0, 2);

    function shiftMonth(delta: number) {
        const d = new Date(calYear, calMonth + delta, 1);
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
    }

    return (
        <>
            <Head title="Mon planning" />

            <Page title="Mon planning" description="Présence, affectations et historique">
                <div className="flex flex-col gap-4">
                    <div role="tablist" aria-label="Période" className="inline-flex w-fit gap-1 rounded-2xl bg-slate-100/80 p-1">
                        {(['week', 'month', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                role="tab"
                                aria-selected={period === p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    'h-8 rounded-xl px-4 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                    period === p ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                                )}
                            >
                                {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
                            </button>
                        ))}
                    </div>

                    <StatStrip
                        items={[
                            {
                                label: 'Jours travaillés',
                                value: current.visits,
                                sub: periodLabel[period],
                                live: visits.some((v) => v.date === today && v.status === 'in_progress'),
                            },
                            {
                                label: 'Temps total',
                                value: current.total_minutes > 0 ? formatDuration(current.total_minutes) : '–',
                                sub: avg > 0 ? `environ ${formatDuration(avg)} par jour` : 'aucune visite',
                            },
                            { label: 'Rapports soumis', value: current.reports, sub: periodLabel[period] },
                            {
                                label: 'Taux de rapport',
                                value: current.visits > 0 ? `${Math.round((current.reports / current.visits) * 100)}%` : '–',
                                sub: 'visites avec rapport',
                            },
                        ]}
                    />

                    {/* Le bloc occupe la hauteur restante de l'écran : calendrier et cartes vont jusqu'en bas */}
                    <div className="grid gap-4 lg:min-h-[calc(100dvh-23rem)] lg:grid-cols-[minmax(0,1fr)_23rem]">
                        <MonthCalendar
                            year={calYear}
                            month={calMonth}
                            visits={visits}
                            onPrev={() => shiftMonth(-1)}
                            onNext={() => shiftMonth(1)}
                            onToday={() => {
                                setCalYear(now.getFullYear());
                                setCalMonth(now.getMonth());
                            }}
                            isCurrentMonth={isCurrentMonth}
                        />

                        <div className="flex flex-col gap-4">
                            <section className={cn(card, 'flex flex-1 flex-col gap-4 p-5')}>
                                <h2 className="text-sm font-semibold text-ink">Mes affectations</h2>
                                {recentAffectations.length === 0 ? (
                                    <p className="text-sm text-slate-400">Votre responsable vous assignera bientôt un site.</p>
                                ) : (
                                    <ul className="flex flex-col gap-4">
                                        {recentAffectations.map((a) => (
                                            <AffectationItem key={a.id} a={a} />
                                        ))}
                                    </ul>
                                )}
                                {sortedAffectations.length > 2 && (
                                    <SeeAll count={sortedAffectations.length} onClick={() => setModal('affectations')} />
                                )}
                            </section>

                            <section className={cn(card, 'flex flex-1 flex-col gap-4 p-5')}>
                                <h2 className="text-sm font-semibold text-ink">Dernières présences</h2>
                                {recentVisits.length === 0 ? (
                                    <EmptyState
                                        icon={CalendarRange}
                                        title="Aucune présence"
                                        description="Vos journées de terrain apparaîtront ici."
                                    />
                                ) : (
                                    <ul className="flex flex-col gap-4">
                                        {recentVisits.map((v) => (
                                            <PresenceItem key={v.id} v={v} today={today} />
                                        ))}
                                    </ul>
                                )}
                                {visits.length > 2 && <SeeAll count={visits.length} onClick={() => setModal('presences')} />}
                            </section>
                        </div>
                    </div>
                </div>
            </Page>

            {modal === 'affectations' && (
                <Modal
                    onClose={() => setModal(null)}
                    title="Mes affectations"
                    description="Sites assignés, actifs et à venir."
                    icon={<MapPin />}
                >
                    <ul className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
                        {sortedAffectations.map((a) => (
                            <AffectationItem key={a.id} a={a} detailed />
                        ))}
                    </ul>
                </Modal>
            )}

            {modal === 'presences' && (
                <Modal
                    onClose={() => setModal(null)}
                    title="Historique des présences"
                    description="Vos journées de terrain des 90 derniers jours."
                    icon={<CalendarRange />}
                >
                    <ul className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-3 pb-6">
                        {visits.map((v) => (
                            <PresenceItem key={v.id} v={v} today={today} detailed />
                        ))}
                    </ul>
                </Modal>
            )}
        </>
    );
}

TerrainPlanning.layout = {
    breadcrumbs: [{ title: 'Mon planning', href: terrainPlanning().url }],
};