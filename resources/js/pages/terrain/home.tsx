import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarOff,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Flag,
    LogIn,
    MapPin,
    Navigation,
    TriangleAlert,
} from 'lucide-react';
import { useId, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { home as terrainHome } from '@/routes/terrain';
import { show as reportShow } from '@/routes/terrain/report';
import { store as visitStore, checkout as visitCheckout } from '@/routes/terrain/visit';

/* ─────────────────────── Types ─────────────────────── */

type Affectation = {
    id: number;
    site_id: number;
    site_name: string;
    site_city: string;
    site_type: string;
    site_address: string | null;
    slot_start: string | null;
    slot_end: string | null;
};

type VisitInfo = {
    id: number;
    status: 'in_progress' | 'completed' | 'incomplete';
    checked_in_at: string;
    checked_out_at: string | null;
    duration_minutes: number | null;
    has_report: boolean;
    report_status: 'draft' | 'submitted' | null;
};

type MyStats = {
    total_visits: number;
    visits_this_month: number;
    visits_last_month: number;
    revenue_this_month: number;
    revenue_last_month: number;
    units_sold_this_month: number;
    units_last_month: number;
    reports_submitted: number;
    reports_this_month: number;
};

type TrendPoint = { label: string; visits: number; revenue: number };

type RecentReport = {
    id: number;
    visit_id: number;
    site_name: string;
    report_date: string;
    report_date_iso: string;
    submitted_at: string | null;
};

type MonthTarget = { actual: number; target: number; projection: number };

type Props = {
    affectation: Affectation | null;
    next_affectation: { site_name: string | null; starts_on: string } | null;
    visit: VisitInfo | null;
    my_stats: MyStats;
    my_target: MonthTarget | null;
    recent_reports: RecentReport[];
    weekly_trend: TrendPoint[];
};

/* ─────────────────────── Helpers ─────────────────────── */

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
}

const visitTone: Record<string, StatusTone> = {
    in_progress: 'success',
    completed: 'info',
    incomplete: 'warning',
};
const visitLabel: Record<string, string> = {
    in_progress: 'En service',
    completed: 'Terminé',
    incomplete: 'Incomplet',
};

/* ─────────────────────── LiveDot ─────────────────────── */

function LiveDot({ className }: { className?: string }) {
    return (
        <span className={cn('relative flex size-2 shrink-0', className)}>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
    );
}

/* ─────────────────────── RingGauge ─────────────────────── */

function RingGauge({
    value,
    label,
    caption,
    live,
}: {
    value: number;
    label: string;
    caption: string;
    live?: boolean;
}) {
    const pct = Math.min(100, Math.max(0, value));
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative size-28">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-slate-100" />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pct / 100)}
                        className="stroke-motriks transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tracking-tight text-ink tabular-nums">
                    {Math.round(pct)}%
                </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
                {live && <LiveDot />}
                {label}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{caption}</p>
        </div>
    );
}

/* ─────────────────────── Compare ─────────────────────── */

function Compare({
    label,
    current,
    previous,
    format,
    unit,
}: {
    label: string;
    current: number;
    previous: number;
    format: (n: number) => string;
    unit?: string;
}) {
    const max = Math.max(current, previous, 1);
    const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

    return (
        <div className="rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                {delta !== null && (
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                            delta >= 0 ? 'bg-green-100 text-motriks-deep' : 'bg-red-100 text-red-700',
                        )}
                    >
                        {delta > 0 ? '+' : ''}
                        {delta} %
                    </span>
                )}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">
                {format(current)}
                {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
            </p>
            <div
                className="relative mt-4 h-1.5 rounded-full bg-slate-200/70"
                role="img"
                aria-label={`${label} : ${format(current)} ce mois, ${format(previous)} le mois dernier`}
            >
                <div
                    className="h-full rounded-full bg-motriks transition-[width] duration-700 motion-reduce:transition-none"
                    style={{ width: `${(current / max) * 100}%` }}
                />
                <span
                    className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-slate-500"
                    style={{ left: `${(previous / max) * 100}%` }}
                />
            </div>
            <p className="mt-2 text-xs text-slate-500">
                Mois dernier{' '}
                <span className="font-medium tabular-nums text-slate-700">
                    {format(previous)}
                    {unit ? ` ${unit}` : ''}
                </span>
            </p>
        </div>
    );
}

/* ─────────────────────── TrendChart ─────────────────────── */

function TrendChart({ data }: { data: TrendPoint[] }) {
    const gradientId = useId();
    const hasRevenue = data.some((d) => d.revenue > 0);
    const [metric, setMetric] = useState<'visits' | 'revenue'>('visits');
    const [active, setActive] = useState<number | null>(null);

    const values = data.map((d) => (metric === 'revenue' ? d.revenue : d.visits));
    const max = Math.max(...values, 1);

    const safeLen = Math.max(data.length - 1, 1);
    const points = values.map((v, i) => ({
        x: (i / safeLen) * 100,
        y: 90 - (v / max) * 76,
    }));

    const line = points
        .map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const mx = (prev.x + p.x) / 2;
            return `C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
        })
        .join(' ');
    const area = `${line} L 100 90 L 0 90 Z`;

    const fmt = (v: number) =>
        metric === 'revenue' ? `${formatCurrency(v)} FCFA` : `${v} visite${v > 1 ? 's' : ''}`;

    const onMove = (e: MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - r.left) / r.width;
        setActive(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
    };

    const activePoint = active !== null ? points[active] : null;

    return (
        <div>
            {hasRevenue && (
                <div className="mb-3 flex justify-end">
                    <div role="group" aria-label="Indicateur" className="inline-flex rounded-xl bg-slate-100 p-1">
                        {(['visits', 'revenue'] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMetric(m)}
                                aria-pressed={metric === m}
                                className={cn(
                                    'h-7 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                    metric === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {m === 'visits' ? 'Visites' : "Chiffre d'affaires"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative h-44" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
                <svg
                    className="absolute inset-0 size-full overflow-visible"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#12b76a" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#12b76a" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[14, 52, 90].map((y) => (
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
                    <path d={area} fill={`url(#${gradientId})`} />
                    <path
                        d={line}
                        fill="none"
                        stroke="#039855"
                        strokeWidth="2"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>

                {activePoint && active !== null && (
                    <>
                        <span
                            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-motriks"
                            style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }}
                        />
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3 py-2 text-center shadow-lg"
                            style={{
                                left: `clamp(14%, ${activePoint.x}%, 86%)`,
                                top: `calc(${activePoint.y}% - 14px)`,
                            }}
                        >
                            <p className="text-[11px] text-slate-400">{data[active].label}</p>
                            <p className="text-xs font-semibold whitespace-nowrap text-white tabular-nums">
                                {fmt(values[active])}
                            </p>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400">
                {data.map((d) => (
                    <span key={d.label}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────── Objectif du mois ─────────────────────── */

/** Objectif de chiffre d'affaires fixé par le responsable : réalisé et projection de fin de mois. */
function TargetProgress({ target }: { target: MonthTarget }) {
    const percent = Math.min(100, (target.actual / target.target) * 100);
    const reached = target.actual >= target.target;
    const onTrack = target.projection >= target.target;

    return (
        <div className="border-t border-slate-100 pt-4">
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink">Objectif du mois</p>
                <p className="text-xs tabular-nums text-slate-500">
                    <span className="font-semibold text-ink">{formatCurrency(target.actual)}</span> / {formatCurrency(target.target)} FCFA
                </p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-motriks" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
                {reached
                    ? 'Objectif atteint, bravo !'
                    : onTrack
                      ? 'En bonne voie pour l’atteindre à ce rythme.'
                      : `Il reste ${formatCurrency(target.target - target.actual)} FCFA à réaliser.`}
            </p>
        </div>
    );
}

/* ─────────────────────── JourneeCard ─────────────────────── */

function JourneeCard({
    affectation,
    nextAffectation,
    visit,
    onCheckin,
    onCheckout,
    loading,
    gpsStatus,
}: {
    affectation: Affectation | null;
    nextAffectation: Props['next_affectation'];
    visit: VisitInfo | null;
    onCheckin: () => void;
    onCheckout: () => void;
    loading: boolean;
    gpsStatus: 'idle' | 'capturing' | 'denied';
}) {
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const todayFmt = today.charAt(0).toUpperCase() + today.slice(1);

    return (
        <GlowCard className="lg:col-span-2" contentClassName="flex flex-col p-6 gap-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-ink">Journée du jour</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{todayFmt}</p>
                </div>
                {visit && (
                    <div className="self-start">
                        <StatusBadge tone={visitTone[visit.status] ?? 'neutral'}>
                            {visitLabel[visit.status] ?? visit.status}
                        </StatusBadge>
                    </div>
                )}
            </div>

            {/* Pas d'affectation */}
            {!affectation && (
                <EmptyState
                    icon={CalendarOff}
                    title="Pas de point de vente aujourd'hui"
                    description={
                        nextAffectation
                            ? `Votre prochaine affectation : ${nextAffectation.site_name ?? 'un point de vente'}, à partir du ${nextAffectation.starts_on}.`
                            : "Vous n'êtes affectée à aucun point de vente. Contactez votre responsable."
                    }
                />
            )}

            {/* Affectation, pas encore de visite */}
            {affectation && !visit && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-motriks text-white shadow-sm shadow-green-600/25">
                            <MapPin className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="font-semibold text-ink">{affectation.site_name}</p>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {affectation.site_type} · {affectation.site_city}
                            </p>
                            {affectation.site_address && (
                                <p className="mt-0.5 text-xs text-slate-400">{affectation.site_address}</p>
                            )}
                            {(affectation.slot_start || affectation.slot_end) && (
                                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-motriks-soft px-3 py-1 text-xs font-semibold text-motriks-deep ring-1 ring-green-100">
                                    <Clock className="size-3.5" />
                                    {affectation.slot_start ?? '–'} → {affectation.slot_end ?? '–'}
                                </p>
                            )}
                        </div>
                    </div>

                    {gpsStatus === 'capturing' && (
                        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                            <Navigation className="size-3.5 animate-pulse text-motriks" />
                            Capture de votre position GPS…
                        </p>
                    )}
                    {gpsStatus === 'denied' && (
                        <p className="flex items-center justify-center gap-1.5 text-xs text-amber-600">
                            <TriangleAlert className="size-3.5" />
                            GPS indisponible — pointage sans localisation.
                        </p>
                    )}

                    <ActionButton
                        onClick={onCheckin}
                        loading={loading}
                        icon={<LogIn />}
                        className="h-14 w-full rounded-2xl text-base"
                    >
                        {loading ? 'Pointage en cours…' : 'Prendre mon service'}
                    </ActionButton>
                </div>
            )}

            {/* Visite en cours */}
            {visit?.status === 'in_progress' && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-motriks-soft p-4 ring-1 ring-green-100">
                        <div className="flex items-center gap-3">
                            <LiveDot />
                            <div>
                                <p className="text-xs font-medium text-green-700">En service depuis</p>
                                <p className="text-2xl font-bold tabular-nums text-motriks-deep">
                                    {visit.checked_in_at}
                                </p>
                            </div>
                        </div>
                        {affectation && (
                            <div className="text-right">
                                <p className="text-xs text-slate-500">{affectation.site_type}</p>
                                <p className="text-sm font-semibold text-ink">{affectation.site_name}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-ink">Rapport journalier</p>
                            <StatusBadge tone={visit.report_status === 'submitted' ? 'success' : 'warning'}>
                                {visit.report_status === 'submitted' ? 'Soumis' : 'Brouillon'}
                            </StatusBadge>
                        </div>
                        <p className="text-sm text-slate-500">
                            Saisissez vos ventes et soumettez avant de partir.
                        </p>
                        <ActionLink
                            href={reportShow({ visit: visit.id }).url}
                            icon={<ClipboardList />}
                            className="h-11 w-full rounded-xl"
                        >
                            {visit.report_status === 'submitted' ? 'Voir mon rapport' : 'Saisir mes ventes'}
                        </ActionLink>
                    </div>

                    <ActionButton
                        variant="secondary"
                        icon={<Flag />}
                        onClick={onCheckout}
                        className="h-11 w-full rounded-xl border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                    >
                        Terminer mon service
                    </ActionButton>
                </div>
            )}

            {/* Journée terminée */}
            {visit && visit.status !== 'in_progress' && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Arrivée', value: visit.checked_in_at, icon: LogIn },
                            { label: 'Départ', value: visit.checked_out_at ?? '–', icon: Flag },
                            {
                                label: 'Durée',
                                value: visit.duration_minutes ? formatDuration(visit.duration_minutes) : '–',
                                icon: Clock,
                            },
                        ].map((t) => (
                            <div
                                key={t.label}
                                className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"
                            >
                                <t.icon className="size-4 text-slate-400" />
                                <p className="text-xs text-slate-500">{t.label}</p>
                                <p className="text-base font-bold tabular-nums text-ink">{t.value}</p>
                            </div>
                        ))}
                    </div>

                    <div
                        className={cn(
                            'flex items-center gap-3 rounded-2xl p-4 ring-1',
                            visit.report_status === 'submitted'
                                ? 'bg-motriks-soft ring-green-100'
                                : 'bg-amber-50 ring-amber-100',
                        )}
                    >
                        {visit.report_status === 'submitted' ? (
                            <CheckCircle2 className="size-5 shrink-0 text-motriks" />
                        ) : (
                            <TriangleAlert className="size-5 shrink-0 text-amber-500" />
                        )}
                        <p
                            className={cn(
                                'text-sm font-medium',
                                visit.report_status === 'submitted' ? 'text-green-800' : 'text-amber-800',
                            )}
                        >
                            {visit.report_status === 'submitted'
                                ? 'Rapport soumis — bonne journée !'
                                : 'Rapport non soumis. Pensez à le compléter.'}
                        </p>
                    </div>

                    {visit.has_report && (
                        <ActionLink
                            href={reportShow({ visit: visit.id }).url}
                            variant="secondary"
                            icon={<ClipboardList />}
                            className="h-11 w-full rounded-xl"
                        >
                            {visit.report_status === 'submitted' ? 'Voir mon rapport' : 'Compléter mon rapport'}
                        </ActionLink>
                    )}
                </div>
            )}
        </GlowCard>
    );
}

/* ─────────────────────── Page principale ─────────────────────── */

export default function TerrainHome({
    affectation,
    next_affectation,
    visit,
    my_stats,
    my_target,
    recent_reports,
    weekly_trend,
}: Props) {
    const { auth } = usePage().props as { auth: { user: { name: string }; company?: { name: string } } };
    const firstName = auth?.user?.name?.split(' ')[0] ?? '';
    const companyName = auth?.company?.name;
    const todayLabel = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const today = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

    const description = [firstName ? `Bonjour ${firstName}` : 'Bonjour', companyName, today]
        .filter(Boolean)
        .join(' · ');

    const [loading, setLoading] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'denied'>('idle');
    const [confirmCheckout, setConfirmCheckout] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);

    // Indicateurs pour les jauges
    const reportsRate =
        my_stats.visits_this_month > 0
            ? Math.round((my_stats.reports_this_month / my_stats.visits_this_month) * 100)
            : 0;
    const monthProgress =
        my_stats.visits_last_month > 0
            ? Math.min(100, Math.round((my_stats.visits_this_month / my_stats.visits_last_month) * 100))
            : my_stats.visits_this_month > 0
              ? 100
              : 0;

    function checkin() {
        if (!affectation) return;
        setLoading(true);
        setGpsStatus('capturing');

        const doCheckin = (lat?: number, lng?: number) => {
            router.post(
                visitStore().url,
                { affectation_id: affectation.id, latitude: lat ?? null, longitude: lng ?? null },
                {
                    onSuccess: () =>
                        toast.success('Service pris', {
                            description: `Bonne journée sur ${affectation.site_name} !`,
                        }),
                    onError: toastFormError,
                    onFinish: () => {
                        setLoading(false);
                        setGpsStatus('idle');
                    },
                },
            );
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsStatus('idle');
                    doCheckin(pos.coords.latitude, pos.coords.longitude);
                },
                () => {
                    setGpsStatus('denied');
                    toast.warning('GPS indisponible');
                    doCheckin();
                },
                { timeout: 8000 },
            );
        } else {
            setGpsStatus('denied');
            doCheckin();
        }
    }

    function checkout() {
        if (!visit) return;
        setCheckingOut(true);

        const doCheckout = (lat?: number, lng?: number) => {
            router.patch(
                visitCheckout({ visit: visit.id }).url,
                { latitude: lat ?? null, longitude: lng ?? null },
                {
                    onSuccess: () => {
                        toast.success('Service terminé', { description: 'Merci pour votre journée !' });
                        setConfirmCheckout(false);
                    },
                    onError: toastFormError,
                    onFinish: () => setCheckingOut(false),
                },
            );
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => doCheckout(pos.coords.latitude, pos.coords.longitude),
                () => doCheckout(),
                { timeout: 8000 },
            );
        } else {
            doCheckout();
        }
    }

    const revenueDelta =
        my_stats.revenue_last_month > 0
            ? Math.round(((my_stats.revenue_this_month - my_stats.revenue_last_month) / my_stats.revenue_last_month) * 100)
            : null;

    return (
        <>
            <Head title="Tableau de bord" />
            <GlowStyles />

            <Page title="Tableau de bord" description={description}>
                <div className="flex flex-col gap-6">
                    {/* ── Chiffres clés ── */}
                    <MetricStrip
                        items={[
                            {
                                label: "Chiffre d'affaires",
                                value: (
                                    <>
                                        {formatCurrency(my_stats.revenue_this_month)}
                                        <span className="text-sm font-medium text-slate-400">FCFA</span>
                                    </>
                                ),
                                sub: revenueDelta !== null
                                    ? `${revenueDelta > 0 ? '+' : ''}${revenueDelta}% vs mois dernier`
                                    : 'ce mois',
                            },
                            {
                                label: 'Visites ce mois',
                                value: my_stats.visits_this_month,
                                sub: `${my_stats.total_visits} au total`,
                                live: visit?.status === 'in_progress',
                            },
                            {
                                label: 'Unités vendues',
                                value: my_stats.units_sold_this_month,
                                sub: `${my_stats.units_last_month > 0 ? `vs ${my_stats.units_last_month} le mois dernier` : 'ce mois'}`,
                            },
                            {
                                label: 'Rapports soumis',
                                value: my_stats.reports_submitted,
                                sub: `${my_stats.reports_this_month} ce mois`,
                            },
                        ]}
                    />

                    {/* ── Row 1 : Journée + Jauges ── */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <JourneeCard
                            affectation={affectation}
                            nextAffectation={next_affectation}
                            visit={visit}
                            onCheckin={checkin}
                            onCheckout={() => setConfirmCheckout(true)}
                            loading={loading}
                            gpsStatus={gpsStatus}
                        />

                        <GlowCard contentClassName="flex h-full flex-col p-6">
                            <div>
                                <h3 className="text-base font-semibold text-ink">Ce mois</h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Performance vs mois précédent.
                                </p>
                            </div>
                            <div className="my-auto grid grid-cols-2 gap-4 py-6">
                                <RingGauge
                                    value={reportsRate}
                                    label="Taux rapport"
                                    caption={`${my_stats.reports_this_month}/${my_stats.visits_this_month} visites`}
                                />
                                <RingGauge
                                    value={monthProgress}
                                    label="Vs mois passé"
                                    caption={`${my_stats.visits_this_month} visites`}
                                    live={visit?.status === 'in_progress'}
                                />
                            </div>
                            {my_target && <TargetProgress target={my_target} />}
                        </GlowCard>
                    </div>

                    {/* ── Row 2 : Tendance + Compare + Rapports récents ── */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <GlowCard className="lg:col-span-2" contentClassName="flex flex-col p-6">
                            <div>
                                <h3 className="text-base font-semibold text-ink">Tendance des 7 derniers jours</h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Comparaison avec le mois précédent.
                                </p>
                            </div>

                            <div className="mt-6">
                                <TrendChart data={weekly_trend} />
                            </div>

                            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                                <Compare
                                    label="Chiffre d'affaires"
                                    current={my_stats.revenue_this_month}
                                    previous={my_stats.revenue_last_month}
                                    format={formatCurrency}
                                    unit="FCFA"
                                />
                                <Compare
                                    label="Visites"
                                    current={my_stats.visits_this_month}
                                    previous={my_stats.visits_last_month}
                                    format={(n) => n.toString()}
                                />
                            </div>
                        </GlowCard>

                        {/* Rapports récents */}
                        <GlowCard contentClassName="flex flex-col p-0">
                            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-ink">Mes rapports</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">Derniers soumis.</p>
                                </div>
                                <Link
                                    href="/terrain/rapports"
                                    className="inline-flex items-center gap-1 rounded-full bg-motriks-soft px-3 py-1 text-xs font-semibold text-motriks-deep transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks"
                                >
                                    Voir tout
                                </Link>
                            </div>

                            {recent_reports.length > 0 ? (
                                <ul className="divide-y divide-slate-100">
                                    {recent_reports.map((r) => (
                                        <li key={r.id}>
                                            <Link
                                                href={reportShow({ visit: r.visit_id }).url}
                                                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-green-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-inset"
                                            >
                                                <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-green-50 text-center ring-1 ring-inset ring-green-600/10 transition-colors group-hover:bg-motriks group-hover:ring-0">
                                                    <p className="text-xs font-bold text-motriks-deep transition-colors group-hover:text-white">
                                                        {new Date(r.report_date_iso)
                                                            .getDate()
                                                            .toString()
                                                            .padStart(2, '0')}
                                                    </p>
                                                    <p className="text-[10px] capitalize text-slate-500 transition-colors group-hover:text-green-100">
                                                        {new Date(r.report_date_iso).toLocaleDateString(
                                                            'fr-FR',
                                                            { weekday: 'short' },
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-motriks-deep">
                                                        {r.site_name}
                                                    </p>
                                                    {r.submitted_at && (
                                                        <p className="flex items-center gap-1 text-xs text-slate-400">
                                                            <ClipboardCheck className="size-3" />
                                                            {r.submitted_at}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-1 items-center justify-center p-8">
                                    <EmptyState
                                        icon={ClipboardList}
                                        title="Aucun rapport"
                                        description="Vos rapports soumis apparaîtront ici."
                                    />
                                </div>
                            )}
                        </GlowCard>
                    </div>
                </div>
            </Page>

            <ConfirmDialog
                open={confirmCheckout}
                onOpenChange={setConfirmCheckout}
                title="Terminer votre service ?"
                description="Votre heure de départ et votre position seront enregistrées. Assurez-vous d'avoir soumis votre rapport."
                confirmLabel="Terminer mon service"
                icon={Flag}
                tone="primary"
                loading={checkingOut}
                onConfirm={checkout}
            />
        </>
    );
}

TerrainHome.layout = {
    breadcrumbs: [{ title: 'Tableau de bord', href: terrainHome().url }],
};
