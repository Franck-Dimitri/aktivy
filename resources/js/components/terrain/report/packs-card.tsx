import { Minus, Plus } from 'lucide-react';
import { SurfaceCard } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/components/terrain/report/types';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';

/* ─── Packs de l’événement ─── */

export function PacksCard({ report, state }: ReportViewProps) {
    const { packCounts, setPackCounts, busy, canAddPack } = state;

    return (
        <SurfaceCard contentClassName="p-5">
            <h3 className="text-base font-semibold text-ink">
                Packs de l'événement
            </h3>
            <p className="mt-0.5 mb-4 text-sm text-slate-500">
                Comptez ici les packs vendus : leurs produits sont retirés du
                stock automatiquement.
            </p>
            <div className="flex flex-col gap-3">
                {report.packs.map((pack) => {
                    const count = packCounts[pack.id] ?? 0;

                    return (
                        <div
                            key={pack.id}
                            className={cn(
                                'flex flex-wrap items-center gap-3 rounded-2xl p-4 ring-1',
                                count > 0
                                    ? 'bg-motriks-soft ring-green-200'
                                    : 'bg-white ring-slate-100',
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-ink">
                                    {pack.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {pack.items
                                        .map(
                                            (i) =>
                                                `${i.quantity} × ${i.name}${i.free ? ' (offert)' : ''}`,
                                        )
                                        .join(' + ')}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatMoney(pack.value)} FCFA le pack
                                </p>
                            </div>
                            <div className="inline-flex items-center rounded-2xl bg-slate-100 p-1">
                                <button
                                    type="button"
                                    disabled={busy !== null || count <= 0}
                                    onClick={() =>
                                        setPackCounts({
                                            ...packCounts,
                                            [pack.id]: count - 1,
                                        })
                                    }
                                    className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm active:scale-90 disabled:opacity-40"
                                    aria-label={`Retirer un pack ${pack.name}`}
                                >
                                    <Minus className="size-4" />
                                </button>
                                <span className="w-12 text-center text-lg font-bold text-ink tabular-nums">
                                    {count}
                                </span>
                                <button
                                    type="button"
                                    disabled={
                                        busy !== null || !canAddPack(pack)
                                    }
                                    onClick={() =>
                                        setPackCounts({
                                            ...packCounts,
                                            [pack.id]: count + 1,
                                        })
                                    }
                                    className="flex size-11 items-center justify-center rounded-xl bg-motriks text-white shadow-sm active:scale-90 disabled:bg-slate-200 disabled:text-slate-400"
                                    aria-label={`Ajouter un pack ${pack.name}`}
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SurfaceCard>
    );
}
