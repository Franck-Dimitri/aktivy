import { Head } from '@inertiajs/react';
import { CalendarRange, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { planning as terrainPlanning } from '@/routes/terrain';

/* ─── Types ─── */

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

/* ─── Helpers ─── */

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

function shortDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
    });
}

const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/* ─── Calendrier mensuel ─── */

type CalDay = {
    day: number;
    date: string;
    worked: boolean;
    isPast: boolean;
    isToday: boolean;
    isFuture: boolean;
    duration: number | null;
};

function MonthCalendar({ year, month, visits, onPrev, onNext }: {
    year: number;
    month: number;
    visits: Visit[];
    onPrev: () => void;
    onNext: () => void;
}) {
    const today = new Date().toISOString().slice(0, 10);

    const visitMap = useMemo(() => {
        const map: Record<string, { worked: boolean; duration: number | null }> = {};
        for (const v of visits) {
            map[v.date] = { worked: true, duration: v.duration_minutes };
        }
        return map;
    }, [visits]);

    const days = useMemo<(CalDay | null)[]>(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const rawFirst = new Date(year, month, 1).getDay();
        const firstOffset = (rawFirst + 6) % 7; // Monday-based

        const cells: (CalDay | null)[] = Array(firstOffset).fill(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const v = visitMap[date];
            cells.push({
                day: d,
                date,
                worked: !!v,
                isPast: date < today,
                isToday: date === today,
                isFuture: date > today,
                duration: v?.duration ?? null,
            });
        }
        return cells;
    }, [year, month, visitMap, today]);

    const workedThisMonth = days.filter((d) => d?.worked).length;
    const pastDays = days.filter((d) => d && !d.isFuture).length;

    return (
        <div className="flex flex-col gap-4">
            {/* Header navigation */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink">
                    {MONTH_NAMES[month]} {year}
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="flex size-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks"
                        aria-label="Mois précédent"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        className="flex size-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks"
                        aria-label="Mois suivant"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </div>

            {/* Taux du mois */}
            {pastDays > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-100">
                    <p className="text-xs text-slate-500">
                        Jours travaillés ce mois
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-motriks transition-[width] duration-700"
                                style={{ width: `${Math.min(100, (workedThisMonth / Math.max(pastDays, 1)) * 100)}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-ink tabular-nums">
                            {workedThisMonth}/{pastDays}
                        </span>
                    </div>
                </div>
            )}

            {/* Grille jours */}
            <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((d) => (
                    <div key={d} className="py-1.5 text-center text-[11px] font-semibold text-slate-400">
                        {d}
                    </div>
                ))}
                {days.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    return (
                        <div
                            key={day.date}
                            title={day.worked && day.duration ? `${day.day} — ${formatDuration(day.duration)}` : undefined}
                            className={cn(
                                'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors',
                                day.isToday && 'ring-2 ring-motriks ring-offset-1',
                                day.worked && 'bg-motriks text-white shadow-sm shadow-green-500/25',
                                !day.worked && day.isPast && 'text-slate-300',
                                !day.worked && day.isToday && 'text-motriks-deep',
                                !day.worked && day.isFuture && 'text-slate-400',
                            )}
                        >
                            {day.day}
                            {day.worked && (
                                <span className="absolute bottom-1 size-1 rounded-full bg-white/60" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Légende */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-motriks" />
                    Jour travaillé
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm ring-2 ring-motriks ring-offset-1" />
                    Aujourd'hui
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-slate-200" />
                    Repos
                </span>
            </div>
        </div>
    );
}

/* ─── Page principale ─── */

export default function TerrainPlanning({ upcoming, visits, stats }: Props) {
    const [period, setPeriod] = useState<Period>('month');
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());

    const currentStats = stats[period];

    const periodLabel: Record<Period, string> = {
        week: 'cette semaine',
        month: 'ce mois',
        year: 'cette année',
    };

    const avgDuration = currentStats.visits > 0
        ? Math.round(currentStats.total_minutes / currentStats.visits)
        : 0;

    function prevMonth() {
        if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
        else setCalMonth((m) => m - 1);
    }
    function nextMonth() {
        if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
        else setCalMonth((m) => m + 1);
    }

    const recentVisits = visits.slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    return (
        <>
            <Head title="Mon planning" />
            <GlowStyles />

            <Page title="Mon planning" description="Présence, affectations et historique">
                <div className="flex flex-col gap-6">
                    {/* ── Sélecteur de période ── */}
                    <div className="flex items-center justify-between gap-4">
                        <div role="group" className="inline-flex rounded-xl bg-slate-100 p-1">
                            {(['week', 'month', 'year'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPeriod(p)}
                                    aria-pressed={period === p}
                                    className={cn(
                                        'h-8 rounded-lg px-4 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                        period === p ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-slate-400 capitalize">{periodLabel[period]}</p>
                    </div>

                    {/* ── KPIs ── */}
                    <MetricStrip
                        items={[
                            {
                                label: 'Jours travaillés',
                                value: currentStats.visits,
                                sub: periodLabel[period],
                                live: visits.some((v) => v.date === today && v.status === 'in_progress'),
                            },
                            {
                                label: 'Temps total',
                                value: currentStats.total_minutes > 0
                                    ? formatDuration(currentStats.total_minutes)
                                    : '–',
                                sub: avgDuration > 0 ? `~${formatDuration(avgDuration)} en moyenne` : 'aucune visite',
                            },
                            {
                                label: 'Rapports soumis',
                                value: currentStats.reports,
                                sub: periodLabel[period],
                            },
                            {
                                label: 'Taux rapport',
                                value: currentStats.visits > 0
                                    ? `${Math.round((currentStats.reports / currentStats.visits) * 100)}%`
                                    : '–',
                                sub: 'visites avec rapport',
                            },
                        ]}
                    />

                    {/* ── Calendrier + Affectations ── */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <GlowCard className="lg:col-span-2" contentClassName="p-6">
                            <MonthCalendar
                                year={calYear}
                                month={calMonth}
                                visits={visits}
                                onPrev={prevMonth}
                                onNext={nextMonth}
                            />
                        </GlowCard>

                        {/* Affectations */}
                        <GlowCard contentClassName="flex flex-col p-0">
                            <div className="px-5 pt-5 pb-3">
                                <h3 className="text-base font-semibold text-ink">Mes affectations</h3>
                                <p className="mt-0.5 text-sm text-slate-500">Sites assignés actifs et à venir.</p>
                            </div>

                            {upcoming.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center p-8">
                                    <EmptyState
                                        icon={CalendarRange}
                                        title="Aucune affectation"
                                        description="Votre responsable vous assignera bientôt un site."
                                    />
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {upcoming.map((a) => (
                                        <li key={a.id} className="px-5 py-3.5">
                                            <div className="flex items-start gap-3">
                                                <span className={cn(
                                                    'flex size-8 shrink-0 items-center justify-center rounded-xl text-white',
                                                    a.is_active ? 'bg-motriks shadow-sm shadow-green-500/25' : 'bg-slate-200',
                                                )}>
                                                    <MapPin className={cn('size-4', !a.is_active && 'text-slate-400')} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-ink">{a.site_name}</p>
                                                        {a.is_active && (
                                                            <span className="shrink-0 rounded-full bg-motriks-soft px-2 py-0.5 text-[10px] font-semibold text-motriks-deep ring-1 ring-green-100">
                                                                Actif
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500">{a.site_type} · {a.site_city}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                                        <span>
                                                            {shortDate(a.starts_on)}
                                                            {a.ends_on ? ` → ${shortDate(a.ends_on)}` : ' → indéfini'}
                                                        </span>
                                                        {(a.slot_start || a.slot_end) && (
                                                            <>
                                                                <span className="text-slate-200">·</span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="size-3" />
                                                                    {a.slot_start ?? '?'} → {a.slot_end ?? '?'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </GlowCard>
                    </div>

                    {/* ── Historique récent ── */}
                    {recentVisits.length > 0 && (
                        <GlowCard contentClassName="p-0">
                            <div className="px-6 pt-5 pb-3">
                                <h3 className="text-base font-semibold text-ink">Historique des présences</h3>
                                <p className="mt-0.5 text-sm text-slate-500">Vos 10 dernières journées de terrain.</p>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {recentVisits.map((v) => {
                                    const isToday = v.date === today;
                                    return (
                                        <li
                                            key={v.id}
                                            className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-green-50/40"
                                        >
                                            {/* Date badge */}
                                            <div className={cn(
                                                'flex size-10 shrink-0 flex-col items-center justify-center rounded-xl text-center',
                                                isToday ? 'bg-motriks shadow-sm shadow-green-500/25' : 'bg-green-50 ring-1 ring-inset ring-green-600/10',
                                            )}>
                                                <p className={cn('text-xs font-bold leading-none', isToday ? 'text-white' : 'text-motriks-deep')}>
                                                    {new Date(v.date + 'T00:00:00').getDate().toString().padStart(2, '0')}
                                                </p>
                                                <p className={cn('mt-0.5 text-[10px] capitalize', isToday ? 'text-green-100' : 'text-slate-400')}>
                                                    {new Date(v.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })}
                                                </p>
                                            </div>

                                            {/* Horaires */}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-ink">
                                                    {formatDate(v.date)}
                                                </p>
                                                <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <span className="size-1.5 rounded-full bg-green-400" />
                                                        {v.checked_in_at}
                                                    </span>
                                                    {v.checked_out_at && (
                                                        <>
                                                            <span className="text-slate-300">→</span>
                                                            <span>{v.checked_out_at}</span>
                                                        </>
                                                    )}
                                                    {v.status === 'in_progress' && (
                                                        <span className="rounded-full bg-motriks-soft px-2 py-0.5 text-[10px] font-semibold text-motriks-deep">
                                                            En cours
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Durée */}
                                            {v.duration_minutes && (
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-bold text-ink tabular-nums">
                                                        {formatDuration(v.duration_minutes)}
                                                    </p>
                                                    <p className="text-xs text-slate-400">sur site</p>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </GlowCard>
                    )}

                    {visits.length === 0 && (
                        <GlowCard contentClassName="p-10">
                            <EmptyState
                                icon={CalendarRange}
                                title="Aucune présence enregistrée"
                                description="Vos journées de terrain apparaîtront ici après votre première prise de service."
                            />
                        </GlowCard>
                    )}
                </div>
            </Page>
        </>
    );
}

TerrainPlanning.layout = {
    breadcrumbs: [{ title: 'Mon planning', href: terrainPlanning().url }],
};
