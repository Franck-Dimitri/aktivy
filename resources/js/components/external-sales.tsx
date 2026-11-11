import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ventes d'une boutique extérieure, telles que renvoyées par App\Support\Reports\ExternalSales::present(). */
export type ExternalShopSales = {
    shop: string;
    revenue: number;
    units: number;
    lines: { id: number; product_id: number | null; product_name: string; unit: string; unit_price: number; units: number; revenue: number }[];
};

const fcfa = (amount: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);

export const externalTotal = (sales: ExternalShopSales[]) => sales.reduce((s, shop) => s + shop.revenue, 0);

/**
 * Ventes en boutique extérieure d'un rapport, boutique par boutique : en lecture seule.
 * Hors stock du point de vente, elles comptent dans le chiffre d'affaires de la journée.
 */
export function ExternalSalesList({ sales, className }: { sales: ExternalShopSales[]; className?: string }) {
    if (sales.length === 0) return null;

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {sales.map((shop) => (
                <div key={shop.shop} className="overflow-hidden rounded-2xl ring-1 ring-slate-200/70">
                    <div className="flex items-center justify-between gap-3 bg-slate-50/80 px-4 py-2.5">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                            <Store className="size-4 shrink-0 text-slate-400" />
                            <span className="truncate">{shop.shop}</span>
                        </p>
                        <p className="shrink-0 text-sm font-bold text-motriks-deep tabular-nums">
                            {fcfa(shop.revenue)} <span className="text-xs font-medium text-slate-400">FCFA</span>
                        </p>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {shop.lines.map((l) => (
                            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                <span className="min-w-0">
                                    <span className="block truncate text-ink">{l.product_name}</span>
                                    <span className="text-xs text-slate-500 tabular-nums">
                                        {l.units} × {fcfa(l.unit_price)} FCFA
                                    </span>
                                </span>
                                <span className="shrink-0 font-semibold text-ink tabular-nums">{fcfa(l.revenue)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
