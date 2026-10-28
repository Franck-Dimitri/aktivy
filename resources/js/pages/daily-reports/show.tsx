import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    MessageSquareText,
    Phone,
} from 'lucide-react';
import { ActionLink } from '@/components/page/buttons';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowStyles, MetricStrip } from '@/components/page/surface';
import { index as dailyReportsIndex } from '@/routes/daily-reports';
import { money, number } from '../reports/format';

type Line = {
    id: number;
    product_name: string;
    unit: string;
    unit_price: number;
    opening_stock: number;
    units_sold: number;
    closing_stock: number;
    revenue: number;
    notes: string | null;
};

type Report = {
    id: number;
    status: 'draft' | 'submitted';
    report_date: string;
    date_label: string;
    agent_name: string | null;
    agent_phone: string | null;
    site_name: string | null;
    site_city: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    duration_minutes: number | null;
    submitted_at: string | null;
    notes: string | null;
    incident_notes: string | null;
    total_revenue: number;
    total_units_sold: number;
    lines: Line[];
};

function duration(minutes: number | null): string {
    if (minutes === null) return '—';

    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

export default function DailyReportShow({
    report,
    currency,
}: {
    report: Report;
    currency: string;
}) {
    const date =
        report.date_label.charAt(0).toUpperCase() + report.date_label.slice(1);

    return (
        <>
            <Head title={`Rapport de ${report.agent_name ?? 'l’hôtesse'}`} />
            <GlowStyles />

            <Page
                title={report.agent_name ?? 'Compte supprimé'}
                description={`${report.site_name ?? '—'}${report.site_city ? ` · ${report.site_city}` : ''} · ${date}`}
                actions={
                    <ActionLink
                        href={
                            dailyReportsIndex({
                                query: { date: report.report_date },
                            }).url
                        }
                        variant="secondary"
                        icon={<ArrowLeft />}
                    >
                        Tous les rapports du jour
                    </ActionLink>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        {report.status === 'submitted' ? (
                            <StatusBadge tone="success">
                                Soumis à {report.submitted_at}
                            </StatusBadge>
                        ) : (
                            <StatusBadge tone="info">
                                Brouillon : pas encore soumis
                            </StatusBadge>
                        )}
                        {report.agent_phone && (
                            <a
                                href={`tel:${report.agent_phone}`}
                                className="inline-flex items-center gap-1 font-semibold text-motriks-deep hover:underline"
                            >
                                <Phone className="size-3.5" />
                                {report.agent_phone}
                            </a>
                        )}
                    </div>

                    <MetricStrip
                        items={[
                            {
                                label: 'CA déclaré',
                                value: money(report.total_revenue, currency),
                                sub:
                                    report.status === 'submitted'
                                        ? 'rapport soumis'
                                        : 'brouillon en cours',
                            },
                            {
                                label: 'Unités vendues',
                                value: number.format(report.total_units_sold),
                                sub: `${report.lines.length} produits suivis`,
                            },
                            {
                                label: 'Arrivée',
                                value: report.checked_in_at ?? '—',
                                sub: `départ ${report.checked_out_at ?? 'non pointé'}`,
                            },
                            {
                                label: 'Durée',
                                value: duration(report.duration_minutes),
                                sub: 'sur le point de vente',
                            },
                        ]}
                    />

                    {report.incident_notes && (
                        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
                            <div>
                                <p className="text-sm font-semibold text-red-800">
                                    Incident signalé
                                </p>
                                <p className="mt-1 text-sm whitespace-pre-wrap text-red-900">
                                    {report.incident_notes}
                                </p>
                            </div>
                        </div>
                    )}

                    {report.notes && (
                        <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                            <MessageSquareText className="mt-0.5 size-5 shrink-0 text-slate-400" />
                            <div>
                                <p className="text-sm font-semibold text-ink">
                                    Notes de l’hôtesse
                                </p>
                                <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">
                                    {report.notes}
                                </p>
                            </div>
                        </div>
                    )}

                    <Panel
                        title="Ventes par produit"
                        description="Stock à l’arrivée, unités vendues et stock restant déclarés par l’hôtesse."
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                                        <th className="px-5 py-3">Produit</th>
                                        <th className="px-3 py-3 text-right">
                                            Prix
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Stock arrivée
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Vendus
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Stock restant
                                        </th>
                                        <th className="px-5 py-3 text-right">
                                            CA
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {report.lines.map((l) => (
                                        <tr key={l.id}>
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-ink">
                                                    {l.product_name}
                                                </p>
                                                {l.notes && (
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {l.notes}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                                                {money(l.unit_price, currency)}
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                                                {number.format(l.opening_stock)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">
                                                {number.format(l.units_sold)}
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                                                {number.format(l.closing_stock)}
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold text-ink tabular-nums">
                                                {money(l.revenue, currency)}
                                            </td>
                                        </tr>
                                    ))}
                                    {report.lines.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-5 py-8 text-center text-slate-500"
                                            >
                                                Aucun produit n’était suivi sur
                                                ce point de vente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>
            </Page>
        </>
    );
}

DailyReportShow.layout = {
    breadcrumbs: [
        { title: 'Rapports journaliers', href: dailyReportsIndex().url },
    ],
};
