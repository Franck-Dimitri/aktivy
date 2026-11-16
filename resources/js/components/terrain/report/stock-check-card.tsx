import { TextInput } from '@/components/page/form-fields';
import { SurfaceCard } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';

/* ─── Contrôle du stock de clôture ─── */

export function StockCheckCard({ state }: ReportViewProps) {
    const {
        lines,
        counted,
        setCounted,
        reasons,
        setReasons,
        theoretical,
        hasGap,
        gapOf,
    } = state;

    return (
        <SurfaceCard contentClassName="p-0">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h3 className="text-base font-semibold text-ink">
                    Contrôle du stock
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                    Comptez ce qu’il reste. Si le chiffre diffère, indiquez
                    pourquoi.
                </p>
            </div>
            <ul className="divide-y divide-slate-100">
                {lines.map((l) => (
                    <li key={l.id} className="px-5 py-3.5 sm:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-medium break-words text-ink">
                                    {l.product_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Attendu : {theoretical(l)} {l.unit}
                                </p>
                            </div>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={counted[l.id] ?? theoretical(l)}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                    setCounted({
                                        ...counted,
                                        [l.id]: e.target.value,
                                    })
                                }
                                aria-label={`Stock compté — ${l.product_name}`}
                                className={cn(
                                    'h-12 w-20 shrink-0 rounded-xl border bg-white text-center text-lg font-bold tabular-nums outline-none',
                                    hasGap(l)
                                        ? 'border-amber-400'
                                        : 'border-slate-200',
                                )}
                            />
                        </div>
                        {hasGap(l) && (
                            <TextInput
                                value={reasons[l.id] ?? ''}
                                onChange={(e) =>
                                    setReasons({
                                        ...reasons,
                                        [l.id]: e.target.value,
                                    })
                                }
                                maxLength={300}
                                placeholder={`Motif de l’écart (${gapOf(l) > 0 ? '+' : ''}${gapOf(l)}) : casse, vol, erreur…`}
                                aria-label={`Motif de l’écart — ${l.product_name}`}
                                className="mt-2.5 h-10 bg-white"
                            />
                        )}
                    </li>
                ))}
            </ul>
        </SurfaceCard>
    );
}
