import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { show as dailyReportShow } from '@/routes/daily-reports';
import { type StockMovementItem } from '@/components/sites/show/types';
import { Section } from '@/components/sites/show/ui';

export function StockMovements({
    movements,
}: {
    movements: StockMovementItem[];
}) {
    if (movements.length === 0) {
        return null;
    }

    return (
        <Section
            title="Mouvements de stock"
            description="Les 50 derniers changements du stock de ce site, du plus récent au plus ancien."
        >
            <ul className="divide-y divide-slate-100">
                {movements.map((m) => (
                    <li
                        key={m.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
                    >
                        <div className="min-w-0 grow basis-full sm:basis-0">
                            <p className="font-medium text-ink">
                                {m.product_name ?? 'Produit retiré'}{' '}
                                <span className="font-normal text-slate-500">
                                    · {m.type_label}
                                </span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {m.date}
                                {m.author && <> · {m.author}</>}
                                {m.notes && <> · {m.notes}</>}
                                {m.daily_report_uuid && (
                                    <>
                                        {' · '}
                                        <Link
                                            href={
                                                dailyReportShow({
                                                    dailyReport:
                                                        m.daily_report_uuid,
                                                }).url
                                            }
                                            className="font-semibold text-motriks-deep hover:underline"
                                        >
                                            voir le rapport
                                        </Link>
                                    </>
                                )}
                            </p>
                        </div>
                        <span
                            className={cn(
                                'ml-auto w-16 text-right font-semibold tabular-nums sm:ml-0',
                                m.quantity > 0
                                    ? 'text-motriks-deep'
                                    : m.quantity < 0
                                      ? 'text-red-600'
                                      : 'text-slate-500',
                            )}
                        >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                        <span className="w-20 text-right text-xs text-slate-500 tabular-nums">
                            stock {m.stock_after}
                        </span>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
