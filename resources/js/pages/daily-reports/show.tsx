import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    FileDown,
    MapPin,
    MessageSquareText,
    Pencil,
    Phone,
    Save,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink, buttonClass } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowStyles, MetricStrip } from '@/components/page/surface';
import { ReportPhotos, type ReportPhoto } from '@/components/report-photos';
import { toastFormError } from '@/lib/form-toast';
import {
    index as dailyReportsIndex,
    update as dailyReportUpdate,
    validate as dailyReportValidate,
    pdf as dailyReportPdf,
} from '@/routes/daily-reports';
import { money, number } from '../reports/format';

type Line = {
    id: number;
    product_name: string;
    unit: string;
    unit_price: number;
    opening_stock: number;
    single_units: number;
    units_sold: number;
    closing_stock: number;
    revenue: number;
    notes: string | null;
};

type Pack = {
    id: number | null;
    name: string;
    value: number;
    quantity: number;
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
    checkin_distance_m: number | null;
    off_site: boolean | null;
    submitted_at: string | null;
    corrected_at: string | null;
    corrected_by: string | null;
    validated_at: string | null;
    validated_by: string | null;
    notes: string | null;
    incident_notes: string | null;
    total_revenue: number;
    total_units_sold: number;
    lines: Line[];
    packs: Pack[];
    photos: ReportPhoto[];
};

function duration(minutes: number | null): string {
    if (minutes === null) return '—';

    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

function distance(meters: number): string {
    return meters >= 1000
        ? `${number.format(Math.round(meters / 100) / 10)} km`
        : `${number.format(meters)} m`;
}

/** Position de la prise de service par rapport au site. */
function CheckinPosition({ report }: { report: Report }) {
    if (report.checkin_distance_m === null) {
        return <StatusBadge tone="neutral">Position non vérifiée</StatusBadge>;
    }

    return report.off_site ? (
        <StatusBadge tone="danger">
            Pointage à {distance(report.checkin_distance_m)} du site
        </StatusBadge>
    ) : (
        <StatusBadge tone="success">Pointage sur le site</StatusBadge>
    );
}

export default function DailyReportShow({
    report,
    currency,
    can_correct,
}: {
    report: Report;
    currency: string;
    can_correct: boolean;
}) {
    const date =
        report.date_label.charAt(0).toUpperCase() + report.date_label.slice(1);
    const sellablePacks = report.packs.filter(
        (p): p is Pack & { id: number } => p.id !== null,
    );

    // Mode correction : quantités vendues à l'unité et packs, modifiables
    const [editing, setEditing] = useState(false);
    const [singles, setSingles] = useState<Record<number, string>>({});
    const [packs, setPacks] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState<'save' | 'validate' | null>(null);

    const startEditing = () => {
        setSingles(
            Object.fromEntries(
                report.lines.map((l) => [l.id, String(l.single_units)]),
            ),
        );
        setPacks(
            Object.fromEntries(
                sellablePacks.map((p) => [p.id, String(p.quantity)]),
            ),
        );
        setEditing(true);
    };

    // Aperçu du CA corrigé : unités × prix + packs × valeur (comme le calcul du serveur)
    const previewRevenue =
        report.lines.reduce(
            (sum, l) => sum + (Number(singles[l.id]) || 0) * l.unit_price,
            0,
        ) +
        sellablePacks.reduce(
            (sum, p) => sum + (Number(packs[p.id]) || 0) * p.value,
            0,
        );

    const save = () => {
        router.put(
            dailyReportUpdate({ dailyReport: report.id }).url,
            {
                lines: report.lines.map((l) => ({
                    id: l.id,
                    units_sold: Number(singles[l.id]) || 0,
                })),
                packs: sellablePacks.map((p) => ({
                    id: p.id,
                    quantity: Number(packs[p.id]) || 0,
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setBusy('save'),
                onSuccess: () => {
                    toast.success('Rapport corrigé', {
                        description: 'Le stock du site a été ajusté.',
                    });
                    setEditing(false);
                },
                onError: toastFormError,
                onFinish: () => setBusy(null),
            },
        );
    };

    const validate = () => {
        if (!confirm('Valider ce rapport ? Il ne pourra plus être corrigé.'))
            return;
        router.post(
            dailyReportValidate({ dailyReport: report.id }).url,
            {},
            {
                preserveScroll: true,
                onStart: () => setBusy('validate'),
                onSuccess: () => toast.success('Rapport validé'),
                onError: toastFormError,
                onFinish: () => setBusy(null),
            },
        );
    };

    const soldPacks = report.packs.filter((p) => p.quantity > 0);

    return (
        <>
            <Head title={`Rapport de ${report.agent_name ?? 'l’hôtesse'}`} />
            <GlowStyles />

            <Page
                title={report.agent_name ?? 'Compte supprimé'}
                description={`${report.site_name ?? '—'}${report.site_city ? ` · ${report.site_city}` : ''} · ${date}`}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <ActionLink
                            href={
                                dailyReportsIndex({
                                    query: { date: report.report_date },
                                }).url
                            }
                            variant="secondary"
                            icon={<ArrowLeft />}
                        >
                            Rapports du jour
                        </ActionLink>
                        <a href={dailyReportPdf({ dailyReport: report.id }).url} className={buttonClass('secondary', 'md')}>
                            <FileDown className="size-4" />
                            PDF
                        </a>
                        {can_correct && !editing && (
                            <>
                                <ActionButton
                                    variant="secondary"
                                    icon={<Pencil />}
                                    onClick={startEditing}
                                >
                                    Corriger
                                </ActionButton>
                                <ActionButton
                                    icon={<BadgeCheck />}
                                    loading={busy === 'validate'}
                                    onClick={validate}
                                >
                                    Valider
                                </ActionButton>
                            </>
                        )}
                    </div>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        {report.validated_at ? (
                            <StatusBadge tone="success">
                                Validé le {report.validated_at}
                                {report.validated_by &&
                                    ` par ${report.validated_by}`}
                            </StatusBadge>
                        ) : report.status === 'submitted' ? (
                            <StatusBadge tone="info">
                                Soumis à {report.submitted_at} · à valider
                            </StatusBadge>
                        ) : (
                            <StatusBadge tone="warning">
                                Brouillon : pas encore soumis
                            </StatusBadge>
                        )}
                        {report.corrected_at && (
                            <StatusBadge tone="warning">
                                Corrigé le {report.corrected_at}
                                {report.corrected_by &&
                                    ` par ${report.corrected_by}`}
                            </StatusBadge>
                        )}
                        <CheckinPosition report={report} />
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

                    {report.off_site && (
                        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                            <MapPin className="mt-0.5 size-5 shrink-0 text-amber-700" />
                            <p className="text-sm text-amber-900">
                                L’hôtesse a pris son service à{' '}
                                <strong>
                                    {distance(report.checkin_distance_m ?? 0)}
                                </strong>{' '}
                                du point de vente. Vérifiez avec elle qu’elle
                                était bien sur place.
                            </p>
                        </div>
                    )}

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

                    {report.photos.length > 0 && (
                        <Panel title="Photos" description="Prises par l’hôtesse sur le point de vente.">
                            <div className="p-5">
                                <ReportPhotos photos={report.photos} />
                            </div>
                        </Panel>
                    )}

                    <Panel
                        title={
                            editing
                                ? 'Correction des ventes'
                                : 'Ventes par produit'
                        }
                        description={
                            editing
                                ? 'Modifiez les unités vendues à l’unité et les packs. L’écart sera reporté sur le stock du site et tracé dans le journal.'
                                : 'Stock à l’arrivée, unités vendues (à l’unité et en packs) et stock restant.'
                        }
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
                                            {editing
                                                ? 'Vendus à l’unité'
                                                : 'Vendus'}
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
                                                {editing ? (
                                                    <TextInput
                                                        type="number"
                                                        min={0}
                                                        inputMode="numeric"
                                                        value={
                                                            singles[l.id] ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            setSingles({
                                                                ...singles,
                                                                [l.id]: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        className="ml-auto h-9 w-24 text-right"
                                                        aria-label={`Unités vendues de ${l.product_name}`}
                                                    />
                                                ) : (
                                                    <>
                                                        {number.format(
                                                            l.units_sold,
                                                        )}
                                                        {l.units_sold >
                                                            l.single_units && (
                                                            <span className="block text-xs font-normal text-slate-400">
                                                                dont{' '}
                                                                {number.format(
                                                                    l.units_sold -
                                                                        l.single_units,
                                                                )}{' '}
                                                                en packs
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                                                {editing
                                                    ? '—'
                                                    : number.format(
                                                          l.closing_stock,
                                                      )}
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold text-ink tabular-nums">
                                                {editing
                                                    ? '—'
                                                    : money(
                                                          l.revenue,
                                                          currency,
                                                      )}
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

                        {(editing
                            ? sellablePacks.length > 0
                            : soldPacks.length > 0) && (
                            <div className="border-t border-slate-100 px-5 py-4">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Packs vendus
                                </p>
                                <ul className="mt-2 divide-y divide-slate-100">
                                    {(editing ? sellablePacks : soldPacks).map(
                                        (p) => (
                                            <li
                                                key={`${p.id}-${p.name}`}
                                                className="flex items-center justify-between gap-3 py-2.5 text-sm"
                                            >
                                                <span className="text-ink">
                                                    {p.name}{' '}
                                                    <span className="text-slate-400">
                                                        ·{' '}
                                                        {money(
                                                            p.value,
                                                            currency,
                                                        )}{' '}
                                                        le pack
                                                    </span>
                                                </span>
                                                {editing && p.id !== null ? (
                                                    <TextInput
                                                        type="number"
                                                        min={0}
                                                        inputMode="numeric"
                                                        value={
                                                            packs[p.id] ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            setPacks({
                                                                ...packs,
                                                                [p.id as number]:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className="h-9 w-24 text-right"
                                                        aria-label={`Packs ${p.name} vendus`}
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-ink tabular-nums">
                                                        {number.format(
                                                            p.quantity,
                                                        )}{' '}
                                                        vendu
                                                        {p.quantity > 1
                                                            ? 's'
                                                            : ''}{' '}
                                                        ·{' '}
                                                        {money(
                                                            p.quantity *
                                                                p.value,
                                                            currency,
                                                        )}
                                                    </span>
                                                )}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        )}

                        {editing && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                                <p className="text-sm text-slate-600">
                                    CA corrigé :{' '}
                                    <span className="font-semibold text-ink tabular-nums">
                                        {money(previewRevenue, currency)}
                                    </span>
                                    <span className="text-slate-400">
                                        {' '}
                                        (avant :{' '}
                                        {money(report.total_revenue, currency)})
                                    </span>
                                </p>
                                <div className="flex gap-2">
                                    <ActionButton
                                        variant="ghost"
                                        icon={<X />}
                                        onClick={() => setEditing(false)}
                                        disabled={busy === 'save'}
                                    >
                                        Annuler
                                    </ActionButton>
                                    <ActionButton
                                        icon={<Save />}
                                        loading={busy === 'save'}
                                        onClick={save}
                                    >
                                        Enregistrer la correction
                                    </ActionButton>
                                </div>
                            </div>
                        )}
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
