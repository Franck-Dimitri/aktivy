import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    MapPinOff,
    Phone,
    UserX,
} from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { SelectInput, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowStyles, MetricStrip } from '@/components/page/surface';
import {
    index as dailyReportsIndex,
    show as dailyReportShow,
} from '@/routes/daily-reports';
import { money, number } from '../reports/format';

type ReportRow = {
    id: number;
    status: 'draft' | 'submitted';
    agent_name: string | null;
    agent_phone: string | null;
    site_name: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    submitted_at: string | null;
    revenue: number;
    units_sold: number;
    has_incident: boolean;
};

type MissingRow = {
    user_id: number;
    agent_name: string | null;
    agent_phone: string | null;
    site_name: string | null;
    slot_start: string | null;
};

type Props = {
    filters: { date: string; site_id: number | null };
    is_today: boolean;
    date_label: string;
    sites: { id: number; name: string }[];
    currency: string;
    reports: ReportRow[];
    missing: MissingRow[];
    has_scope: boolean;
};

/** Décale une date ISO (AAAA-MM-JJ) d'un nombre de jours. */
function shiftDate(iso: string, days: number): string {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);

    return d.toISOString().slice(0, 10);
}

export default function DailyReportsIndex({
    filters,
    is_today,
    date_label,
    sites,
    currency,
    reports,
    missing,
    has_scope,
}: Props) {
    const apply = (next: Partial<Props['filters']>) => {
        const merged = { ...filters, ...next };
        router.get(
            dailyReportsIndex().url,
            {
                date: merged.date,
                ...(merged.site_id ? { site_id: merged.site_id } : {}),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submitted = reports.filter((r) => r.status === 'submitted');
    const drafts = reports.length - submitted.length;
    const revenue = submitted.reduce((sum, r) => sum + r.revenue, 0);
    const label = date_label.charAt(0).toUpperCase() + date_label.slice(1);

    return (
        <>
            <Head title="Rapports journaliers" />
            <GlowStyles />

            <Page
                title="Rapports journaliers"
                description="Ce que vos hôtesses ont déclaré chaque jour : ventes, notes et incidents."
            >
                {!has_scope ? (
                    <Panel>
                        <div className="p-10">
                            <EmptyState
                                icon={MapPinOff}
                                title="Vous ne supervisez aucun point de vente"
                                description="Les rapports des hôtesses apparaîtront ici dès que votre gérant vous aura affecté à un point de vente."
                            />
                        </div>
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Jour et site */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        apply({
                                            date: shiftDate(filters.date, -1),
                                        })
                                    }
                                    className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                    aria-label="Jour précédent"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <TextInput
                                    type="date"
                                    icon={CalendarDays}
                                    value={filters.date}
                                    onChange={(e) =>
                                        e.target.value &&
                                        apply({ date: e.target.value })
                                    }
                                    aria-label="Jour"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        apply({
                                            date: shiftDate(filters.date, 1),
                                        })
                                    }
                                    disabled={is_today}
                                    className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                    aria-label="Jour suivant"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                            {sites.length > 1 && (
                                <div className="w-full sm:w-64">
                                    <SelectInput
                                        value={filters.site_id ?? ''}
                                        onChange={(e) =>
                                            apply({
                                                site_id: e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            })
                                        }
                                        aria-label="Point de vente"
                                    >
                                        <option value="">
                                            Tous les points de vente
                                        </option>
                                        {sites.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </div>
                            )}
                            <p className="pb-3 text-sm font-semibold text-ink">
                                {label}
                            </p>
                        </div>

                        <MetricStrip
                            items={[
                                {
                                    label: 'Rapports soumis',
                                    value: submitted.length,
                                    sub: 'rendus et verrouillés',
                                },
                                {
                                    label: is_today ? 'En cours' : 'Non soumis',
                                    value: drafts,
                                    sub: is_today
                                        ? 'hôtesses en service'
                                        : 'brouillons jamais envoyés',
                                },
                                {
                                    label: is_today
                                        ? 'Pas encore pointé'
                                        : 'Absences',
                                    value: missing.length,
                                    sub: 'affectées sans rapport',
                                },
                                {
                                    label: 'CA déclaré',
                                    value: money(revenue, currency),
                                    sub: 'rapports soumis',
                                },
                            ]}
                        />

                        <Panel
                            title="Rapports"
                            description="Cliquez sur un rapport pour voir le détail des ventes."
                        >
                            {reports.length === 0 ? (
                                <div className="p-8">
                                    <EmptyState
                                        icon={ClipboardList}
                                        title="Aucun rapport ce jour-là"
                                        description="Un rapport est créé dès qu’une hôtesse prend son service, puis soumis en fin de journée."
                                    />
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {reports.map((r) => (
                                        <li key={r.id}>
                                            <Link
                                                href={
                                                    dailyReportShow({
                                                        dailyReport: r.id,
                                                    }).url
                                                }
                                                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-green-50/40"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-semibold text-ink">
                                                            {r.agent_name ??
                                                                'Compte supprimé'}
                                                        </p>
                                                        {r.has_incident && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                                                                <AlertTriangle className="size-3" />
                                                                Incident
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {r.site_name ?? '—'} ·
                                                        arrivée{' '}
                                                        {r.checked_in_at ?? '—'}
                                                        {r.checked_out_at && (
                                                            <>
                                                                {' '}
                                                                · départ{' '}
                                                                {
                                                                    r.checked_out_at
                                                                }
                                                            </>
                                                        )}
                                                        {r.submitted_at && (
                                                            <>
                                                                {' '}
                                                                · soumis à{' '}
                                                                {r.submitted_at}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {r.status ===
                                                        'submitted' && (
                                                        <span className="text-right text-sm tabular-nums">
                                                            <span className="font-semibold text-ink">
                                                                {money(
                                                                    r.revenue,
                                                                    currency,
                                                                )}
                                                            </span>
                                                            <span className="block text-xs text-slate-400">
                                                                {number.format(
                                                                    r.units_sold,
                                                                )}{' '}
                                                                unités
                                                            </span>
                                                        </span>
                                                    )}
                                                    {r.status ===
                                                    'submitted' ? (
                                                        <StatusBadge tone="success">
                                                            Soumis
                                                        </StatusBadge>
                                                    ) : (
                                                        <StatusBadge
                                                            tone={
                                                                is_today
                                                                    ? 'info'
                                                                    : 'warning'
                                                            }
                                                        >
                                                            {is_today
                                                                ? 'En cours'
                                                                : 'Non soumis'}
                                                        </StatusBadge>
                                                    )}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        {missing.length > 0 && (
                            <Panel
                                title={
                                    is_today
                                        ? 'Pas encore pointé'
                                        : 'Sans rapport'
                                }
                                description="Hôtesses affectées ce jour-là qui n’ont pas pris leur service."
                            >
                                <ul className="divide-y divide-slate-100">
                                    {missing.map((m) => (
                                        <li
                                            key={m.user_id}
                                            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                                    <UserX className="size-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-ink">
                                                        {m.agent_name ??
                                                            'Compte supprimé'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {m.site_name ?? '—'}
                                                        {m.slot_start && (
                                                            <>
                                                                {' '}
                                                                · attendue à{' '}
                                                                {m.slot_start.slice(
                                                                    0,
                                                                    5,
                                                                )}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {m.agent_phone && (
                                                <a
                                                    href={`tel:${m.agent_phone}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-motriks-deep hover:underline"
                                                >
                                                    <Phone className="size-3.5" />
                                                    {m.agent_phone}
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        )}
                    </div>
                )}
            </Page>
        </>
    );
}

DailyReportsIndex.layout = {
    breadcrumbs: [
        { title: 'Rapports journaliers', href: dailyReportsIndex().url },
    ],
};
