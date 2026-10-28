import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    MapPin,
    MapPinOff,
    PackageX,
    Phone,
    RefreshCw,
    Store,
} from 'lucide-react';
import { useEffect } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowStyles, MetricStrip } from '@/components/page/surface';
import { index as activityIndex } from '@/routes/activity';
import { show as dailyReportShow } from '@/routes/daily-reports';
import { index as stockAlertsIndex } from '@/routes/stock-alerts';
import { money, number } from '../reports/format';

type State = 'expected' | 'on_site' | 'done' | 'missing';

type Hostess = {
    user_id: number;
    name: string | null;
    phone: string | null;
    slot_start: string | null;
    slot_end: string | null;
    state: State;
    checked_in_at: string | null;
    checked_out_at: string | null;
    off_site: boolean;
    report_id: number | null;
    report_status: 'draft' | 'submitted' | null;
    revenue: number;
    units_sold: number;
    has_incident: boolean;
};

type SiteActivity = {
    id: number;
    name: string;
    city: string | null;
    stock_alerts: number;
    hostesses: Hostess[];
};

type Props = {
    updated_at: string;
    currency: string;
    has_scope: boolean;
    totals: {
        expected: number;
        on_site: number;
        done: number;
        missing: number;
        revenue: number;
    };
    sites: SiteActivity[];
};

/** Rafraîchissement automatique de la page. */
const REFRESH_MS = 60_000;

const stateBadge: Record<
    State,
    { tone: StatusTone; label: (h: Hostess) => string }
> = {
    expected: {
        tone: 'neutral',
        label: (h) =>
            h.slot_start ? `Attendue à ${h.slot_start}` : 'Attendue',
    },
    on_site: {
        tone: 'info',
        label: (h) => `En poste depuis ${h.checked_in_at}`,
    },
    done: { tone: 'success', label: (h) => `Terminé à ${h.checked_out_at}` },
    missing: {
        tone: 'danger',
        label: (h) =>
            h.slot_start
                ? `Pas pointé (attendue à ${h.slot_start})`
                : 'Pas pointé',
    },
};

function HostessRow({
    hostess,
    currency,
}: {
    hostess: Hostess;
    currency: string;
}) {
    const badge = stateBadge[hostess.state];

    return (
        <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                        {hostess.name ?? 'Compte supprimé'}
                    </p>
                    <StatusBadge tone={badge.tone}>
                        {badge.label(hostess)}
                    </StatusBadge>
                    {hostess.off_site && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                            <MapPin className="size-3" />
                            Hors site
                        </span>
                    )}
                    {hostess.has_incident && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                            <AlertTriangle className="size-3" />
                            Incident
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                    {hostess.report_status === 'submitted'
                        ? 'Rapport soumis'
                        : hostess.report_status === 'draft'
                          ? 'Rapport en cours'
                          : 'Pas de rapport'}
                    {hostess.phone && (
                        <>
                            {' · '}
                            <a
                                href={`tel:${hostess.phone}`}
                                className="inline-flex items-center gap-0.5 font-medium text-motriks-deep hover:underline"
                            >
                                <Phone className="size-3" />
                                {hostess.phone}
                            </a>
                        </>
                    )}
                </p>
            </div>
            {hostess.report_id ? (
                <Link
                    href={
                        dailyReportShow({ dailyReport: hostess.report_id }).url
                    }
                    className="text-right text-sm tabular-nums hover:underline"
                >
                    <span className="font-semibold text-ink">
                        {money(hostess.revenue, currency)}
                    </span>
                    <span className="block text-xs text-slate-400">
                        {number.format(hostess.units_sold)} unités
                    </span>
                </Link>
            ) : null}
        </li>
    );
}

export default function ActivityIndex({
    updated_at,
    currency,
    has_scope,
    totals,
    sites,
}: Props) {
    // Le tableau se met à jour tout seul, sans recharger la page
    useEffect(() => {
        const timer = setInterval(
            () => router.reload({ only: ['updated_at', 'totals', 'sites'] }),
            REFRESH_MS,
        );

        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <Head title="Activité du jour" />
            <GlowStyles />

            <Page
                title="Activité du jour"
                description={
                    <span className="inline-flex items-center gap-1.5">
                        <RefreshCw className="size-3.5" />
                        Mis à jour à {updated_at} · actualisation automatique
                        chaque minute
                    </span>
                }
            >
                {!has_scope ? (
                    <Panel>
                        <div className="p-10">
                            <EmptyState
                                icon={MapPinOff}
                                title="Vous ne supervisez aucun point de vente"
                                description="L’activité de vos hôtesses apparaîtra ici dès que votre gérant vous aura affecté à un point de vente."
                            />
                        </div>
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                {
                                    label: 'En poste',
                                    value: `${totals.on_site}/${totals.expected}`,
                                    sub: 'hôtesses attendues',
                                    live: totals.on_site > 0,
                                },
                                {
                                    label: 'Terminé',
                                    value: totals.done,
                                    sub: 'journées finies',
                                },
                                {
                                    label: 'Pas pointé',
                                    value: totals.missing,
                                    sub: 'créneau dépassé',
                                },
                                {
                                    label: 'Ventes du jour',
                                    value: money(totals.revenue, currency),
                                    sub: 'déclarées (brouillons enregistrés compris)',
                                },
                            ]}
                        />

                        {sites.length === 0 ? (
                            <Panel>
                                <div className="p-10">
                                    <EmptyState
                                        icon={Store}
                                        title="Personne n’est attendu aujourd’hui"
                                        description="Aucune hôtesse n’a d’affectation en cours ce jour."
                                    />
                                </div>
                            </Panel>
                        ) : (
                            sites.map((site) => (
                                <Panel
                                    key={site.id}
                                    title={site.name}
                                    description={site.city ?? undefined}
                                    actions={
                                        site.stock_alerts > 0 ? (
                                            <Link
                                                href={stockAlertsIndex().url}
                                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                                            >
                                                <PackageX className="size-3.5" />
                                                {site.stock_alerts} alerte
                                                {site.stock_alerts > 1
                                                    ? 's'
                                                    : ''}{' '}
                                                de stock
                                            </Link>
                                        ) : undefined
                                    }
                                >
                                    <ul className="divide-y divide-slate-100">
                                        {site.hostesses.map((h) => (
                                            <HostessRow
                                                key={h.user_id}
                                                hostess={h}
                                                currency={currency}
                                            />
                                        ))}
                                    </ul>
                                </Panel>
                            ))
                        )}
                    </div>
                )}
            </Page>
        </>
    );
}

ActivityIndex.layout = {
    breadcrumbs: [{ title: 'Activité du jour', href: activityIndex().url }],
};
