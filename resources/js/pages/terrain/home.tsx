import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarOff,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Flag,
    Loader2,
    LogIn,
    MapPin,
    Navigation,
    TriangleAlert,
} from 'lucide-react';
import { useId, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { home as terrainHome } from '@/routes/terrain';
import { index as terrainReports } from '@/routes/terrain/reports';
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

type Props = {
    affectation: Affectation | null;
    visit: VisitInfo | null;
    my_stats: MyStats;
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

/* ─────────────────────── LiveDot ─────────────────────── */

function LiveDot({ className }: { className?: string }) {
    return (
        <span className={cn('relative flex size-2.5 shrink-0', className)}>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
        </span>
    );
}

/* ─────────────────────── RingGauge ─────────────────────── */

function RingGauge({
    value,
    label,
    caption,
}: {
    value: number;
    label: string;
    caption: string;
}) {
    const pct = Math.min(100, Math.max(0, value));
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative size-24">
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
                        className="stroke-aktivy transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tracking-tight text-ink tabular-nums">
                    {Math.round(pct)}%
                </span>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">{label}</p>
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
                            delta >= 0 ? 'bg-green-100 text-aktivy-deep' : 'bg-red-100 text-red-700',
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
                    className="h-full rounded-full bg-aktivy transition-[width] duration-700 motion-reduce:transition-none"
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
                                    'h-7 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
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
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
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
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>

                {activePoint && active !== null && (
                    <>
                        <span
                            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-aktivy"
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

/* ─────────────────────── DayBar : journée du jour, version compacte ─────────────────────── */

const primaryBtn =
    'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-aktivy px-4 text-sm font-semibold whitespace-nowrap text-white shadow-sm shadow-green-600/25 transition-all hover:bg-aktivy-deep focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:opacity-70';

const shell =
    'flex w-full flex-wrap items-center gap-3 rounded-2xl bg-white p-2 pl-3.5 shadow-sm ring-1 ring-slate-200 sm:w-auto';

function DayBar({
    affectation,
    visit,
    onCheckin,
    onCheckout,
    loading,
    gpsStatus,
}: {
    affectation: Affectation | null;
    visit: VisitInfo | null;
    onCheckin: () => void;
    onCheckout: () => void;
    loading: boolean;
    gpsStatus: 'idle' | 'capturing' | 'denied';
}) {
    const inProgress = visit?.status === 'in_progress';

    /* Aucune affectation */
    if (!affectation && !visit) {
        return (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm text-slate-500 ring-1 ring-slate-200">
                <CalendarOff className="size-4 shrink-0" />
                Pas de site affecté aujourd'hui
            </div>
        );
    }

    /* Service en cours */
    if (visit && inProgress) {
        return (
            <div className={shell}>
                <LiveDot />
                <div className="min-w-0 flex-1 sm:flex-none">
                    <p className="text-sm font-semibold text-ink">
                        En service depuis <span className="tabular-nums">{visit.checked_in_at}</span>
                    </p>
                    <p className="max-w-56 truncate text-xs text-slate-500">
                        {affectation?.site_name ?? 'Site du jour'}
                    </p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Link href={reportShow({ visit: visit.id }).url} className={cn(primaryBtn, 'flex-1 sm:flex-none')}>
                        <ClipboardList className="size-4" />
                        {visit.report_status === 'submitted' ? 'Voir mon rapport' : 'Saisir mes ventes'}
                    </Link>
                    <button
                        type="button"
                        onClick={onCheckout}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none"
                    >
                        <Flag className="size-4" />
                        Terminer
                    </button>
                </div>
            </div>
        );
    }

    /* Journée terminée */
    if (visit) {
        const submitted = visit.report_status === 'submitted';
        return (
            <div className={shell}>
                <span
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                        submitted ? 'bg-aktivy-soft text-aktivy' : 'bg-amber-50 text-amber-500',
                    )}
                >
                    {submitted ? <CheckCircle2 className="size-5" /> : <TriangleAlert className="size-5" />}
                </span>
                <div className="min-w-0 flex-1 sm:flex-none">
                    <p className="text-sm font-semibold text-ink tabular-nums">
                        {visit.checked_in_at} → {visit.checked_out_at ?? '–'}
                        {visit.duration_minutes ? (
                            <span className="ml-2 font-medium text-slate-400">{formatDuration(visit.duration_minutes)}</span>
                        ) : null}
                    </p>
                    <p className={cn('text-xs', submitted ? 'text-slate-500' : 'text-amber-600')}>
                        {submitted ? 'Rapport soumis, bonne journée !' : 'Rapport non soumis'}
                    </p>
                </div>
                {visit.has_report && (
                    <Link
                        href={reportShow({ visit: visit.id }).url}
                        className={cn(
                            'inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none sm:w-auto',
                            submitted
                                ? 'border border-slate-200 bg-white text-ink hover:bg-slate-50'
                                : 'bg-aktivy text-white shadow-sm shadow-green-600/25 hover:bg-aktivy-deep',
                        )}
                    >
                        {submitted ? 'Voir mon rapport' : 'Compléter mon rapport'}
                        <ChevronRight className="size-4" />
                    </Link>
                )}
            </div>
        );
    }

    /* Prêt à prendre le service */
    const slot =
        affectation && (affectation.slot_start || affectation.slot_end)
            ? `${affectation.slot_start ?? '–'} → ${affectation.slot_end ?? '–'} · `
            : '';

    return (
        <div className={shell}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-aktivy-soft text-aktivy">
                <MapPin className="size-5" />
            </span>
            <div className="min-w-0 flex-1 sm:max-w-60 sm:flex-none">
                <p className="truncate text-sm font-semibold text-ink">{affectation?.site_name}</p>
                {gpsStatus === 'capturing' ? (
                    <p className="flex items-center gap-1 text-xs text-aktivy-deep">
                        <Navigation className="size-3 animate-pulse" />
                        Capture de la position…
                    </p>
                ) : gpsStatus === 'denied' ? (
                    <p className="flex items-center gap-1 text-xs text-amber-600">
                        <TriangleAlert className="size-3" />
                        GPS indisponible
                    </p>
                ) : (
                    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                        <Clock className="size-3 shrink-0" />
                        <span className="truncate">
                            {slot}
                            {affectation?.site_city}
                        </span>
                    </p>
                )}
            </div>
            <button type="button" onClick={onCheckin} disabled={loading} className={cn(primaryBtn, 'w-full sm:w-auto')}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                {loading ? 'Pointage…' : 'Prendre mon service'}
            </button>
        </div>
    );
}

/* ─────────────────────── Page principale ─────────────────────── */

export default function TerrainHome({
    affectation,
    visit,
    my_stats,
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

            <Page
                title="Tableau de bord"
                description={description}
                actions={
                    <DayBar
                        affectation={affectation}
                        visit={visit}
                        onCheckin={checkin}
                        onCheckout={() => setConfirmCheckout(true)}
                        loading={loading}
                        gpsStatus={gpsStatus}
                    />
                }
            >
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
                                sub:
                                    revenueDelta !== null
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
                                sub:
                                    my_stats.units_last_month > 0
                                        ? `vs ${my_stats.units_last_month} le mois dernier`
                                        : 'ce mois',
                            },
                            {
                                label: 'Rapports soumis',
                                value: my_stats.reports_submitted,
                                sub: `${my_stats.reports_this_month} ce mois`,
                            },
                        ]}
                    />

                    {/* ── Analyse + suivi ── */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Tendance + comparaison */}
                        <GlowCard className="lg:col-span-2" contentClassName="flex flex-col p-6">
                            <div>
                                <h3 className="text-base font-semibold text-ink">Activité des 7 derniers jours</h3>
                                <p className="mt-0.5 text-sm text-slate-500">Visites et chiffre d'affaires jour par jour.</p>
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

                        {/* Colonne droite : jauges + rapports */}
                        <div className="flex flex-col gap-6">
                            <GlowCard contentClassName="flex flex-col p-6">
                                <div>
                                    <h3 className="text-base font-semibold text-ink">Performance du mois</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">Comparée au mois précédent.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-6">
                                    <RingGauge
                                        value={reportsRate}
                                        label="Taux rapport"
                                        caption={`${my_stats.reports_this_month}/${my_stats.visits_this_month} visites`}
                                    />
                                    <RingGauge
                                        value={monthProgress}
                                        label="Vs mois passé"
                                        caption={`${my_stats.visits_this_month} visites`}
                                    />
                                </div>
                            </GlowCard>

                            <GlowCard contentClassName="flex flex-col p-0">
                                <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                                    <div>
                                        <h3 className="text-base font-semibold text-ink">Mes rapports</h3>
                                        <p className="mt-0.5 text-sm text-slate-500">Derniers soumis.</p>
                                    </div>
                                    <Link
                                        href={terrainReports().url}
                                        className="inline-flex items-center gap-0.5 rounded-full bg-aktivy-soft px-3 py-1 text-xs font-semibold text-aktivy-deep ring-1 ring-green-200/60 transition-colors hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                    >
                                        Voir tout
                                        <ChevronRight className="size-3.5" />
                                    </Link>
                                </div>

                                {recent_reports.length > 0 ? (
                                    <ul className="divide-y divide-slate-100">
                                        {recent_reports.map((r) => {
                                            const d = new Date(r.report_date_iso + 'T00:00:00');
                                            return (
                                                <li key={r.id}>
                                                    <Link
                                                        href={reportShow({ visit: r.visit_id }).url}
                                                        className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-green-50/40 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none focus-visible:ring-inset"
                                                    >
                                                        <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-green-50 text-center ring-1 ring-green-600/10 transition-colors ring-inset group-hover:bg-aktivy group-hover:ring-0">
                                                            <p className="text-sm leading-none font-bold text-aktivy-deep transition-colors group-hover:text-white">
                                                                {d.getDate().toString().padStart(2, '0')}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] text-slate-500 capitalize transition-colors group-hover:text-green-100">
                                                                {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-aktivy-deep">
                                                                {r.site_name}
                                                            </p>
                                                            {r.submitted_at && (
                                                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                                                    <ClipboardCheck className="size-3" />
                                                                    Soumis à {r.submitted_at}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-aktivy" />
                                                    </Link>
                                                </li>
                                            );
                                        })}
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