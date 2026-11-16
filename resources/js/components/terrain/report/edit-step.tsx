import { ArrowRight, Package } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { SurfaceCard } from '@/components/page/surface';
import {
    store as photoStore,
    destroy as photoDestroy,
} from '@/routes/terrain/report/photos';
import { ReportPhotos } from '@/components/report-photos';
import { ExternalSalesEditor } from '@/components/terrain/external-sales-editor';
import { twoCol, formatMoney } from '@/components/terrain/report/types';
import { ProductRow } from '@/components/terrain/report/product-row';
import { SummaryPanel } from '@/components/terrain/report/summary-panel';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';
import { PacksCard } from '@/components/terrain/report/packs-card';

/* ══════ SAISIE ══════ */

export function EditStep({ visit, report, state, actions }: ReportViewProps) {
    const {
        hasPhotos,
        lines,
        notes,
        setNotes,
        externalShops,
        setExternalShops,
        busy,
        setStep,
        packUnits,
        external,
        totalSold,
        totalRevenue,
        filledCount,
        remainingStock,
        updateLine,
        updateLineNote,
        photosOffline,
    } = state;
    const { saveDraft } = actions;

    return (
        <>
            <div className={twoCol}>
                <div className="flex min-w-0 flex-col gap-6">
                    <SurfaceCard contentClassName="p-0">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div>
                                <h3 className="text-base font-semibold text-ink">
                                    Ventes par produit
                                </h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Saisissez les unités vendues pour chaque
                                    produit.
                                </p>
                            </div>
                            {lines.length > 0 && (
                                <span className="shrink-0 rounded-full bg-motriks-soft px-3 py-1 text-xs font-semibold text-motriks-deep ring-1 ring-green-200/60">
                                    {filledCount}/{lines.length}
                                </span>
                            )}
                        </div>

                        {lines.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                                <Package className="size-10 text-slate-200" />
                                <p className="text-sm font-medium text-slate-500">
                                    Aucun produit configuré
                                </p>
                                <p className="text-xs text-slate-500">
                                    Votre responsable doit d'abord ajouter des
                                    produits à ce site.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {lines.map((line) => (
                                    <ProductRow
                                        key={line.id}
                                        line={line}
                                        reserved={packUnits[line.id] ?? 0}
                                        onChange={(sold) =>
                                            updateLine(line.id, sold)
                                        }
                                        onNoteChange={(note) =>
                                            updateLineNote(line.id, note)
                                        }
                                        disabled={busy !== null}
                                    />
                                ))}
                            </ul>
                        )}
                    </SurfaceCard>

                    {report.packs.length > 0 && (
                        <PacksCard
                            visit={visit}
                            report={report}
                            state={state}
                            actions={actions}
                        />
                    )}

                    {report.external_products.length > 0 && (
                        <SurfaceCard contentClassName="p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-ink">
                                        Boutiques extérieures
                                    </h3>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Ventes faites ailleurs que sur votre
                                        point de vente, avec les mêmes produits
                                        et aux mêmes prix. Elles comptent dans
                                        votre journée mais ne sortent pas de
                                        votre stock.
                                    </p>
                                </div>
                                {external.revenue > 0 && (
                                    <span className="shrink-0 rounded-full bg-motriks-soft px-3 py-1 text-xs font-semibold whitespace-nowrap text-motriks-deep tabular-nums ring-1 ring-green-200/60">
                                        {formatMoney(external.revenue)} FCFA
                                    </span>
                                )}
                            </div>
                            <ExternalSalesEditor
                                shops={externalShops}
                                products={report.external_products}
                                suggestions={report.external_shops}
                                onChange={setExternalShops}
                                disabled={busy !== null}
                            />
                        </SurfaceCard>
                    )}

                    {hasPhotos && (
                        <SurfaceCard contentClassName="p-5">
                            <h3 className="text-base font-semibold text-ink">
                                Photos
                            </h3>
                            <p className="mt-0.5 mb-4 text-sm text-slate-500">
                                Stand, rayon, rupture de stock… elles
                                accompagnent votre rapport.
                            </p>
                            <ReportPhotos
                                photos={report.photos}
                                max={report.max_photos}
                                uploadUrl={
                                    photoStore({
                                        visit: visit.uuid,
                                    }).url
                                }
                                deleteUrl={(photo) =>
                                    photoDestroy({
                                        visit: visit.uuid,
                                        photo,
                                    }).url
                                }
                                offline={photosOffline}
                            />
                        </SurfaceCard>
                    )}
                </div>

                <div className="lg:sticky lg:top-6">
                    <SummaryPanel
                        totalSold={totalSold}
                        totalRevenue={totalRevenue}
                        filledCount={filledCount}
                        totalLines={lines.length}
                        remainingStock={remainingStock}
                        notes={notes}
                        onNotes={setNotes}
                        busy={busy}
                        onSave={() => saveDraft()}
                        onReview={() => setStep('review')}
                    />
                </div>
            </div>

            {/* Barre fixe — mobile uniquement */}
            <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 lg:hidden">
                <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 pl-5 shadow-xl ring-1 shadow-slate-900/10 ring-slate-200 backdrop-blur-md">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-slate-500">
                            {totalSold} unité
                            {totalSold > 1 ? 's' : ''}
                            {external.units > 0
                                ? ` · dont ${external.units} en boutique${external.units > 1 ? 's' : ''}`
                                : ` · ${filledCount} produit${filledCount > 1 ? 's' : ''}`}
                        </p>
                        <p className="truncate text-xl font-bold text-ink tabular-nums">
                            {formatMoney(totalRevenue)}
                            <span className="ml-1.5 text-sm font-medium text-slate-500">
                                FCFA
                            </span>
                        </p>
                    </div>
                    <ActionButton
                        onClick={() => setStep('review')}
                        disabled={busy !== null}
                        icon={<ArrowRight className="order-last" />}
                        className="h-12 shrink-0 rounded-xl px-5 text-sm"
                    >
                        Réviser
                    </ActionButton>
                </div>
            </div>
        </>
    );
}
