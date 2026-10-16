import { Head, router, usePage } from '@inertiajs/react';
import {
    BadgeDollarSign,
    CalendarCheck,
    CalendarOff,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Flag,
    LogIn,
    MapPin,
    Navigation,
    Package,
    TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Panel } from '@/components/page/page';
import { StatCard } from '@/components/page/stat-card';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { home as terrainHome } from '@/routes/terrain';
import { show as reportShow } from '@/routes/terrain/report';
import { store as visitStore, checkout as visitCheckout } from '@/routes/terrain/visit';

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
    report_id: number | null;
};

type MyStats = {
    total_visits: number;
    visits_this_month: number;
    revenue_this_month: number;
    units_sold_this_month: number;
    reports_submitted: number;
};

const badgeTone: Record<string, StatusTone> = {
    in_progress: 'success',
    completed: 'info',
    submitted: 'success',
    draft: 'warning',
};

const badgeLabel: Record<string, string> = {
    in_progress: 'En service',
    completed: 'Terminé',
    submitted: 'Rapport soumis',
    draft: 'Brouillon',
};

function Badge({ status }: { status: string }) {
    return <StatusBadge tone={badgeTone[status] ?? 'neutral'}>{badgeLabel[status] ?? status}</StatusBadge>;
}

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} K`;
    return amount.toFixed(0);
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
}

const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function TerrainHome({
    affectation,
    visit,
    my_stats,
}: {
    affectation: Affectation | null;
    visit: VisitInfo | null;
    my_stats: MyStats;
}) {
    const { auth } = usePage().props as { auth: { user: { name: string } } };
    const [time, setTime] = useState(clock);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'done' | 'denied'>('idle');

    useEffect(() => {
        const t = setInterval(() => setTime(clock()), 10_000);
        return () => clearInterval(t);
    }, []);

    function checkin() {
        if (!affectation) return;
        setLoading(true);
        setGpsStatus('capturing');

        const doCheckin = (lat?: number, lng?: number) => {
            router.post(
                visitStore().url,
                { affectation_id: affectation.id, latitude: lat ?? null, longitude: lng ?? null },
                {
                    preserveScroll: true,
                    onSuccess: () => toast.success('Service pris', { description: `Bon courage sur ${affectation.site_name} !` }),
                    onError: toastFormError,
                    onFinish: () => {
                        setLoading(false);
                        setGpsStatus('idle');
                    },
                },
            );
        };

        const withoutGps = () => {
            setGpsStatus('denied');
            toast.warning('Position indisponible', { description: 'Votre pointage sera enregistré sans localisation.' });
            doCheckin();
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsStatus('done');
                    doCheckin(pos.coords.latitude, pos.coords.longitude);
                },
                withoutGps,
                { timeout: 8000 },
            );
        } else {
            withoutGps();
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
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success('Service terminé', { description: 'Merci pour votre journée !' });
                        setConfirmOpen(false);
                    },
                    onError: toastFormError,
                    onFinish: () => setCheckingOut(false),
                },
            );
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => doCheckout(pos.coords.latitude, pos.coords.longitude), () => doCheckout(), { timeout: 8000 });
        } else {
            doCheckout();
        }
    }

    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <>
            <Head title="Ma journée" />

            <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:py-8">
                <header className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm text-slate-500 capitalize">{today}</p>
                        <h1 className="truncate text-2xl font-bold tracking-tight text-ink">Bonjour, {auth.user.name.split(' ')[0]}</h1>
                    </div>
                    <span className="rounded-2xl bg-aktivy-soft px-3 py-1.5 text-2xl font-extrabold text-aktivy-deep tabular-nums ring-1 ring-green-100">{time}</span>
                </header>

                {!affectation && (
                    <Panel className="p-8 text-center">
                        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <CalendarOff className="size-6" />
                        </span>
                        <p className="mt-4 font-semibold text-ink">Pas de site affecté aujourd'hui</p>
                        <p className="mt-1 text-sm text-slate-500">Contactez votre responsable si vous pensez qu'il y a une erreur.</p>
                    </Panel>
                )}

                {affectation && (
                    <>
                        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-green-600 to-green-700 p-6 text-white shadow-xl shadow-green-600/25">
                            <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-white/10" />
                            <div className="pointer-events-none absolute -right-4 -bottom-16 size-40 rounded-full bg-white/5" />
                            <p className="text-sm font-medium text-green-100">Votre site du jour</p>
                            <p className="mt-1 text-2xl font-bold tracking-tight">{affectation.site_name}</p>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-green-100">
                                <MapPin className="size-4 shrink-0" />
                                {affectation.site_type} · {affectation.site_city}
                            </p>
                            {affectation.site_address && <p className="mt-0.5 text-sm text-green-100/80">{affectation.site_address}</p>}
                            {(affectation.slot_start || affectation.slot_end) && (
                                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                                    <Clock className="size-4" />
                                    {affectation.slot_start ?? '–'} → {affectation.slot_end ?? '–'}
                                </p>
                            )}
                        </div>

                        {!visit && (
                            <Panel className="p-5 text-center">
                                <p className="text-sm text-slate-600">Vous n'avez pas encore pris votre service. Appuyez sur le bouton pour démarrer.</p>
                                {gpsStatus === 'capturing' && (
                                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                                        <Navigation className="size-3.5 animate-pulse text-aktivy" />
                                        Capture de votre position…
                                    </p>
                                )}
                                {gpsStatus === 'denied' && (
                                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600">
                                        <TriangleAlert className="size-3.5" />
                                        GPS indisponible : pointage sans localisation.
                                    </p>
                                )}
                                <ActionButton onClick={checkin} loading={loading} icon={<LogIn />} className="mt-4 h-14 w-full rounded-2xl text-base">
                                    {loading ? 'Pointage en cours…' : 'Prendre mon service'}
                                </ActionButton>
                            </Panel>
                        )}

                        {visit?.status === 'in_progress' && (
                            <>
                                <Panel className="flex items-center justify-between p-5">
                                    <div>
                                        <p className="text-xs text-slate-500">Prise de service</p>
                                        <p className="text-2xl font-bold text-aktivy-deep tabular-nums">{visit.checked_in_at}</p>
                                    </div>
                                    <Badge status="in_progress" />
                                </Panel>

                                <Panel className="flex flex-col gap-3 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-ink">Rapport journalier</p>
                                        <Badge status={visit.report_status ?? 'draft'} />
                                    </div>
                                    <p className="text-sm text-slate-500">Saisissez vos ventes et soumettez avant de partir.</p>
                                    <ActionLink href={reportShow({ visit: visit.id }).url} icon={<ClipboardList />} className="h-12 w-full rounded-2xl">
                                        Ouvrir mon rapport
                                    </ActionLink>
                                </Panel>

                                <Panel className="p-5 text-center">
                                    <p className="mb-3 text-sm text-slate-600">Prêt à partir ? Terminez votre service.</p>
                                    <ActionButton
                                        variant="secondary"
                                        icon={<Flag />}
                                        onClick={() => setConfirmOpen(true)}
                                        className="h-12 w-full rounded-2xl border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                                    >
                                        Terminer mon service
                                    </ActionButton>
                                </Panel>
                            </>
                        )}

                        {visit && visit.status !== 'in_progress' && (
                            <Panel className="p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <p className="font-semibold text-ink">Journée terminée</p>
                                    <Badge status={visit.report_status === 'submitted' ? 'submitted' : 'completed'} />
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    {[
                                        { label: 'Arrivée', value: visit.checked_in_at },
                                        { label: 'Départ', value: visit.checked_out_at ?? '–' },
                                        { label: 'Durée', value: visit.duration_minutes ? formatDuration(visit.duration_minutes) : '–' },
                                    ].map((t) => (
                                        <div key={t.label} className="rounded-xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">{t.label}</p>
                                            <p className="font-bold text-ink">{t.value}</p>
                                        </div>
                                    ))}
                                </div>
                                {visit.has_report && (
                                    <ActionLink href={reportShow({ visit: visit.id }).url} variant="secondary" icon={<ClipboardList />} className="mt-4 h-11 w-full">
                                        Voir mon rapport
                                    </ActionLink>
                                )}
                            </Panel>
                        )}
                    </>
                )}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-slate-500">Mes statistiques du mois</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={CalendarCheck} label="Visites ce mois" value={my_stats.visits_this_month} sub={`${my_stats.total_visits} au total`} />
                        <StatCard icon={BadgeDollarSign} label="CA ce mois" value={`${formatCurrency(my_stats.revenue_this_month)} FCFA`} highlight />
                        <StatCard icon={Package} label="Unités vendues" value={my_stats.units_sold_this_month} />
                        <StatCard icon={ClipboardCheck} label="Rapports soumis" value={my_stats.reports_submitted} />
                    </div>
                </section>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Terminer votre service ?"
                description="Votre heure de départ et votre position seront enregistrées. Pensez à soumettre votre rapport avant de partir."
                confirmLabel="Terminer mon service"
                icon={CheckCircle2}
                tone="primary"
                loading={checkingOut}
                onConfirm={checkout}
            />
        </>
    );
}

TerrainHome.layout = {
    breadcrumbs: [{ title: 'Ma journée', href: terrainHome().url }],
};
