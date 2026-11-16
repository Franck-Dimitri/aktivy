import { Package, Store } from 'lucide-react';
import { SurfaceCard } from '@/components/page/surface';
import { externalTotals } from '@/components/terrain/external-sales-editor';
import { formatMoney } from '@/components/terrain/report/types';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';

/* ─── Ticket récapitulatif des ventes ─── */

export function ReviewTicket({ report, state }: ReportViewProps) {
    const {
        packCounts,
        externalShops,
        external,
        totalSold,
        totalRevenue,
        soldLines,
    } = state;

    return (
        <SurfaceCard contentClassName="p-0">
            <div className="border-b border-dashed border-slate-200 px-5 py-4 sm:px-6">
                <h3 className="text-base font-semibold text-ink">
                    Récapitulatif
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                    {report.site_name} · {report.report_date}
                </p>
            </div>

            {soldLines.length === 0 && external.units === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                    Aucune vente saisie.
                </p>
            ) : (
                <ul className="divide-y divide-dashed divide-slate-200">
                    {soldLines.map((l) => (
                        <li
                            key={l.id}
                            className="flex items-center gap-4 px-5 py-3.5 sm:px-6"
                        >
                            {l.image_url ? (
                                <img
                                    src={l.image_url}
                                    alt={l.product_name}
                                    className="size-11 shrink-0 rounded-xl object-cover"
                                />
                            ) : (
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                    <Package className="size-4 text-slate-300" />
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink">
                                    {l.product_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {l.units_sold} × {formatMoney(l.unit_price)}{' '}
                                    FCFA
                                </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-motriks-deep tabular-nums">
                                {formatMoney(l.units_sold * l.unit_price)}
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            {report.packs
                .filter((p) => (packCounts[p.id] ?? 0) > 0)
                .map((p) => (
                    <div
                        key={`pack-${p.id}`}
                        className="flex items-center gap-4 border-t border-dashed border-slate-200 px-5 py-3.5 sm:px-6"
                    >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-motriks-soft">
                            <Package className="size-4 text-motriks-deep" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                                {p.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {packCounts[p.id]} pack
                                {(packCounts[p.id] ?? 0) > 1 ? 's' : ''} ×{' '}
                                {formatMoney(p.value)} FCFA
                            </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-motriks-deep tabular-nums">
                            {formatMoney((packCounts[p.id] ?? 0) * p.value)}
                        </p>
                    </div>
                ))}

            {/* Ventes en boutique extérieure : une ligne par boutique */}
            {externalShops
                .filter(
                    (s) =>
                        s.name.trim() !== '' &&
                        s.items.some((i) => i.product_id !== null),
                )
                .map((s) => {
                    const sold = externalTotals([s], report.external_products);

                    return (
                        <div
                            key={`ext-${s.key}`}
                            className="flex items-center gap-4 border-t border-dashed border-slate-200 px-5 py-3.5 sm:px-6"
                        >
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                <Store className="size-4 text-slate-500" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink">
                                    {s.name.trim()}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Boutique extérieure · {sold.units} unité
                                    {sold.units > 1 ? 's' : ''}
                                </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-motriks-deep tabular-nums">
                                {formatMoney(sold.revenue)}
                            </p>
                        </div>
                    );
                })}

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-dashed border-slate-200 px-5 py-5 sm:px-6">
                <div>
                    <p className="text-sm font-bold text-ink">Total journée</p>
                    <p className="text-xs text-slate-500">
                        {totalSold} unité
                        {totalSold > 1 ? 's' : ''} vendues
                    </p>
                </div>
                <p className="text-3xl font-extrabold whitespace-nowrap text-motriks-deep tabular-nums">
                    {formatMoney(totalRevenue)}
                    <span className="ml-1 text-sm font-medium text-slate-500">
                        FCFA
                    </span>
                </p>
            </div>
        </SurfaceCard>
    );
}
