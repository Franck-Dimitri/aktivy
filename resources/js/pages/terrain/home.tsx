import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, type ReactNode } from 'react';
import { store as visitStore, checkout as visitCheckout } from '@/routes/terrain/visit';
import { show as reportShow } from '@/routes/terrain/report';
import { home as terrainHome } from '@/routes/terrain';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        in_progress: 'bg-green-100 text-green-800',
        completed:   'bg-blue-100 text-blue-800',
        submitted:   'bg-indigo-100 text-indigo-800',
        draft:       'bg-amber-100 text-amber-800',
    };
    const labels: Record<string, string> = {
        in_progress: 'En service',
        completed:   'Terminé',
        submitted:   'Rapport soumis',
        draft:       'Brouillon',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-700'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {labels[status] ?? status}
        </span>
    );
}

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} K`;
    return amount.toFixed(0);
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

/* ------------------------------------------------------------------ */
/*  Page principale                                                     */
/* ------------------------------------------------------------------ */
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
    const [time, setTime] = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    const [loading, setLoading] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'done' | 'denied'>('idle');

    // Horloge en direct
    useEffect(() => {
        const t = setInterval(() => {
            setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        }, 10_000);
        return () => clearInterval(t);
    }, []);

    function checkin() {
        if (!affectation) return;
        setLoading(true);
        setGpsStatus('capturing');

        const doCheckin = (lat?: number, lng?: number) => {
            router.post(visitStore().url, {
                affectation_id: affectation.id,
                latitude: lat ?? null,
                longitude: lng ?? null,
            }, {
                onFinish: () => setLoading(false),
            });
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsStatus('done');
                    doCheckin(pos.coords.latitude, pos.coords.longitude);
                },
                () => {
                    setGpsStatus('denied');
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
        setLoading(true);

        const doCheckout = (lat?: number, lng?: number) => {
            router.patch(visitCheckout({ visit: visit.id }).url, {
                latitude: lat ?? null,
                longitude: lng ?? null,
            }, {
                onFinish: () => setLoading(false),
            });
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

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

    return (
        <>
            <Head title="Ma journée" />

            {/* En-tête */}
            <div className="mb-6">
                <p className="text-sm capitalize text-slate-500">{today}</p>
                <div className="flex items-end justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Bonjour, {auth.user.name.split(' ')[0]} 👋</h1>
                    <span className="text-3xl font-extrabold tabular-nums text-green-600">{time}</span>
                </div>
            </div>

            {/* Pas d'affectation aujourd'hui */}
            {!affectation && (
                <Card className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-3xl">📅</div>
                    <p className="font-semibold text-slate-800">Pas de site affecté aujourd'hui</p>
                    <p className="mt-1 text-sm text-slate-500">Contactez votre responsable si vous pensez qu'il y a une erreur.</p>
                </Card>
            )}

            {/* Affectation + actions */}
            {affectation && (
                <div className="flex flex-col gap-4">
                    {/* Carte site */}
                    <Card>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Votre site du jour</p>
                        <p className="text-xl font-bold text-slate-900">{affectation.site_name}</p>
                        <p className="text-sm text-slate-500">{affectation.site_type} · {affectation.site_city}</p>
                        {affectation.site_address && (
                            <p className="mt-1 text-sm text-slate-400">{affectation.site_address}</p>
                        )}
                        {(affectation.slot_start || affectation.slot_end) && (
                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                                🕐 {affectation.slot_start ?? '–'} → {affectation.slot_end ?? '–'}
                            </p>
                        )}
                    </Card>

                    {/* Pas encore pointé */}
                    {!visit && (
                        <Card className="text-center">
                            <p className="mb-4 text-sm text-slate-600">Vous n'avez pas encore pris votre service. Appuyez sur le bouton pour démarrer.</p>
                            {gpsStatus === 'capturing' && (
                                <p className="mb-3 text-xs text-slate-400">📍 Capture de votre position…</p>
                            )}
                            {gpsStatus === 'denied' && (
                                <p className="mb-3 text-xs text-amber-500">⚠️ GPS non disponible – pointage sans localisation.</p>
                            )}
                            <button
                                onClick={checkin}
                                disabled={loading}
                                className="w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-green-600/30 transition active:scale-95 disabled:opacity-60"
                            >
                                {loading ? 'Pointage…' : '✅ Prendre mon service'}
                            </button>
                        </Card>
                    )}

                    {/* Visite en cours */}
                    {visit?.status === 'in_progress' && (
                        <>
                            <Card className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400">Prise de service</p>
                                    <p className="text-2xl font-bold text-green-600">{visit.checked_in_at}</p>
                                </div>
                                <StatusBadge status="in_progress" />
                            </Card>

                            {/* Rapport brouillon */}
                            <Card className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-slate-800">Rapport journalier</p>
                                    <StatusBadge status={visit.report_status ?? 'draft'} />
                                </div>
                                <p className="text-sm text-slate-500">Saisissez vos ventes et soumettez avant de partir.</p>
                                <a
                                    href={reportShow({ visit: visit.id }).url}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition active:scale-95"
                                >
                                    📋 Ouvrir mon rapport
                                </a>
                            </Card>

                            {/* Fin de service */}
                            <Card className="text-center">
                                <p className="mb-3 text-sm text-slate-600">Prêt à partir ? Terminez votre service.</p>
                                <button
                                    onClick={checkout}
                                    disabled={loading}
                                    className="w-full rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-base font-bold text-red-600 transition active:scale-95 disabled:opacity-60"
                                >
                                    {loading ? 'Enregistrement…' : '🏁 Terminer mon service'}
                                </button>
                            </Card>
                        </>
                    )}

                    {/* Visite terminée aujourd'hui */}
                    {visit && visit.status !== 'in_progress' && (
                        <Card>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="font-semibold text-slate-800">Journée terminée</p>
                                <StatusBadge status={visit.report_status === 'submitted' ? 'submitted' : 'completed'} />
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-400">Arrivée</p>
                                    <p className="font-bold text-slate-800">{visit.checked_in_at}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-400">Départ</p>
                                    <p className="font-bold text-slate-800">{visit.checked_out_at ?? '–'}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-400">Durée</p>
                                    <p className="font-bold text-slate-800">
                                        {visit.duration_minutes ? formatDuration(visit.duration_minutes) : '–'}
                                    </p>
                                </div>
                            </div>
                            {visit.has_report && (
                                <a
                                    href={reportShow({ visit: visit.id }).url}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                                >
                                    📋 Voir mon rapport
                                </a>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* Stats personnelles */}
            <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Mes statistiques — ce mois</p>
                <div className="grid grid-cols-2 gap-3">
                    <Card>
                        <p className="text-2xl font-bold text-slate-900">{my_stats.visits_this_month}</p>
                        <p className="text-xs text-slate-500">Visites ce mois</p>
                        <p className="mt-0.5 text-xs text-slate-400">{my_stats.total_visits} au total</p>
                    </Card>
                    <Card>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(my_stats.revenue_this_month)} FCFA</p>
                        <p className="text-xs text-slate-500">CA ce mois</p>
                    </Card>
                    <Card>
                        <p className="text-2xl font-bold text-slate-900">{my_stats.units_sold_this_month}</p>
                        <p className="text-xs text-slate-500">Unités vendues</p>
                    </Card>
                    <Card>
                        <p className="text-2xl font-bold text-indigo-600">{my_stats.reports_submitted}</p>
                        <p className="text-xs text-slate-500">Rapports soumis</p>
                    </Card>
                </div>
            </div>
        </>
    );
}

TerrainHome.layout = {
    breadcrumbs: [{ title: 'Ma journée', href: terrainHome().url }],
};
