import { AlertTriangle, CheckCircle2, Flag, Package } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { SurfaceCard } from '@/components/page/surface';
import { store as photoStore } from '@/routes/terrain/report/photos';
import { ReportPhotos } from '@/components/report-photos';
import { ExternalSalesList, externalTotal } from '@/components/external-sales';
import { twoCol, formatMoney } from '@/components/terrain/report/types';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';

/* ══════ SOUMIS : lecture seule ══════ */

export function SubmittedView({ visit, report, state }: ReportViewProps) {
    const { hasPhotos, setStep, setConfirmCheckout, photosOffline } = state;

    return (
        <div className={twoCol}>
            <div className="flex min-w-0 flex-col gap-6">
                <SurfaceCard contentClassName="p-0">
                    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                        <h3 className="text-base font-semibold text-ink">
                            Détail par produit
                        </h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {report.lines.map((l) => (
                            <li
                                key={l.id}
                                className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6"
                            >
                                {l.image_url ? (
                                    <img
                                        src={l.image_url}
                                        alt={l.product_name}
                                        className="size-12 shrink-0 rounded-xl object-cover"
                                    />
                                ) : (
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                                        <Package className="size-4 text-slate-300" />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-ink">
                                        {l.product_name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Stock {l.opening_stock} →{' '}
                                        {l.closing_stock} {l.unit}
                                        {l.units_sold + l.pack_units > 0 &&
                                            ` · ${l.units_sold + l.pack_units} vendus`}
                                        {l.pack_units > 0 &&
                                            ` (dont ${l.pack_units} en packs)`}
                                    </p>
                                    {l.notes && (
                                        <p className="mt-0.5 text-xs text-slate-500 italic">
                                            {l.notes}
                                        </p>
                                    )}
                                    {l.stock_gap !== 0 && (
                                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                                            Écart {l.stock_gap > 0 ? '+' : ''}
                                            {l.stock_gap} : {l.gap_reason}
                                        </p>
                                    )}
                                </div>
                                {l.revenue > 0 && (
                                    <p className="shrink-0 font-semibold whitespace-nowrap text-motriks-deep tabular-nums">
                                        {formatMoney(l.revenue)}
                                        <span className="ml-1 text-xs font-medium text-slate-500">
                                            FCFA
                                        </span>
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </SurfaceCard>

                {report.external_sales.length > 0 && (
                    <SurfaceCard contentClassName="p-5">
                        <div className="mb-4 flex items-baseline justify-between gap-3">
                            <h3 className="text-base font-semibold text-ink">
                                Boutiques extérieures
                            </h3>
                            <span className="text-sm font-semibold text-motriks-deep tabular-nums">
                                {formatMoney(
                                    externalTotal(report.external_sales),
                                )}{' '}
                                FCFA
                            </span>
                        </div>
                        <ExternalSalesList sales={report.external_sales} />
                    </SurfaceCard>
                )}
            </div>

            <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                <div className="flex items-center gap-4 rounded-2xl bg-motriks-soft p-5 ring-1 ring-green-100">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-motriks text-white shadow-lg shadow-motriks/30">
                        <CheckCircle2 className="size-6" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold text-green-900">
                            {report.validated
                                ? 'Validé par votre responsable'
                                : `Soumis à ${report.submitted_at}`}
                        </p>
                        {report.corrected && (
                            <p className="text-xs text-green-700">
                                Quantités corrigées par votre responsable.
                            </p>
                        )}
                        <p className="text-2xl font-extrabold text-motriks-deep tabular-nums">
                            {formatMoney(report.total_revenue)}
                            <span className="ml-1 text-sm font-medium text-green-700/70">
                                FCFA
                            </span>
                        </p>
                        <p className="text-xs text-green-700">
                            {report.total_units_sold} unité
                            {report.total_units_sold > 1 ? 's' : ''} vendues
                        </p>
                    </div>
                </div>

                {(report.photos.length > 0 ||
                    (!report.validated && hasPhotos)) && (
                    <SurfaceCard contentClassName="p-5">
                        <h3 className="mb-3 text-sm font-semibold text-slate-500">
                            Photos
                        </h3>
                        <ReportPhotos
                            photos={report.photos}
                            max={report.max_photos}
                            uploadUrl={
                                report.validated || !hasPhotos
                                    ? undefined
                                    : photoStore({
                                          visit: visit.uuid,
                                      }).url
                            }
                            offline={photosOffline}
                        />
                    </SurfaceCard>
                )}

                {report.notes && (
                    <SurfaceCard contentClassName="p-5">
                        <h3 className="mb-1.5 text-sm font-semibold text-slate-500">
                            Notes du jour
                        </h3>
                        <p className="text-sm leading-relaxed text-ink">
                            {report.notes}
                        </p>
                    </SurfaceCard>
                )}

                {report.incident_notes && (
                    <SurfaceCard contentClassName="p-5">
                        <h3 className="mb-1.5 text-sm font-semibold text-amber-600">
                            Incident signalé
                        </h3>
                        <p className="text-sm leading-relaxed text-amber-800">
                            {report.incident_notes}
                        </p>
                    </SurfaceCard>
                )}

                <div className="flex flex-col gap-2.5">
                    {visit.status === 'in_progress' && (
                        <ActionButton
                            variant="secondary"
                            icon={<Flag />}
                            onClick={() => setConfirmCheckout(true)}
                            className="h-12 w-full rounded-2xl border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                        >
                            Terminer mon service
                        </ActionButton>
                    )}
                    <ActionButton
                        variant="secondary"
                        icon={<AlertTriangle />}
                        onClick={() => setStep('incident')}
                        className="h-11 w-full rounded-2xl border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                    >
                        Signaler une erreur
                    </ActionButton>
                </div>
            </div>
        </div>
    );
}
