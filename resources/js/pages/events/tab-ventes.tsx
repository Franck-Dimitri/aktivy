import { MapPin, Package, TrendingUp } from 'lucide-react';
import { GlowCard } from '@/components/page/surface';
import { formatMoney } from './types';
import type { EventSales } from './types';

type Props = { sales: EventSales };

export function TabVentes({ sales }: Props) {
    if (sales.reports_count === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                    <TrendingUp className="size-6 text-blue-400" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700">Aucune vente enregistrée</p>
                <p className="mt-1 max-w-xs text-xs text-slate-400">
                    Les stats apparaîtront ici dès que les hôtesses soumettront leurs rapports journaliers.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* ── KPIs ── */}
            <div className="grid grid-cols-3 gap-3">
                <GlowCard contentClassName="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">CA total</p>
                    <p className="mt-1.5 text-2xl font-black tabular-nums text-slate-900">
                        {formatMoney(sales.revenue)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">FCFA</p>
                </GlowCard>
                <GlowCard contentClassName="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Unités vendues</p>
                    <p className="mt-1.5 text-2xl font-black tabular-nums text-slate-900">
                        {formatMoney(sales.units_sold)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">unités</p>
                </GlowCard>
                <GlowCard contentClassName="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rapports soumis</p>
                    <p className="mt-1.5 text-2xl font-black tabular-nums text-slate-900">
                        {sales.reports_count}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">journées</p>
                </GlowCard>
            </div>

            {/* ── Par PDV ── */}
            {sales.by_pdv.length > 0 && (
                <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        <MapPin className="size-3.5" /> Par point de vente
                    </p>
                    <GlowCard>
                        <div className="divide-y divide-slate-50">
                            {sales.by_pdv.map((pdv, i) => (
                                <div key={pdv.id} className="flex items-center gap-4 px-5 py-3.5">
                                    <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-300">
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{pdv.name}</p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {pdv.reports_count} rapport{pdv.reports_count > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold tabular-nums text-slate-800">
                                            {formatMoney(pdv.revenue)}{' '}
                                            <span className="text-xs font-medium text-slate-400">FCFA</span>
                                        </p>
                                        <p className="text-xs text-slate-400">{formatMoney(pdv.units_sold)} unités</p>
                                    </div>
                                    <div className="w-16 shrink-0">
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-motriks transition-all"
                                                style={{
                                                    width: `${sales.revenue > 0 ? Math.round((pdv.revenue / sales.revenue) * 100) : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlowCard>
                </div>
            )}

            {/* ── Top produits ── */}
            {sales.by_product.length > 0 && (
                <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        <Package className="size-3.5" /> Top produits
                    </p>
                    <GlowCard>
                        <div className="divide-y divide-slate-50">
                            {sales.by_product.map((p, i) => (
                                <div key={p.name} className="flex items-center gap-4 px-5 py-3">
                                    <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-300">
                                        {i + 1}
                                    </span>
                                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                                        {p.name}
                                    </p>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold tabular-nums text-slate-800">
                                            {formatMoney(p.revenue)}{' '}
                                            <span className="text-xs font-medium text-slate-400">FCFA</span>
                                        </p>
                                        <p className="text-xs text-slate-400">{formatMoney(p.units_sold)} unités</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlowCard>
                </div>
            )}
        </div>
    );
}
