import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Panel } from '@/components/page/page';
import { monthName, money, number, signedPercent } from './format';

export type MonthRow = { date: string; revenue: number; units_sold: number; reports_count: number; variation: number | null };

function Variation({ value }: { value: number | null }) {
    if (value === null) return <span className="text-slate-300">—</span>;

    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    const tone = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-500' : 'text-slate-400';

    return (
        <span className="inline-flex items-center justify-end gap-1.5 tabular-nums text-slate-700">
            <Icon className={`size-3.5 ${tone}`} />
            {signedPercent(value)}
        </span>
    );
}

export function MonthlyTable({ rows, currency }: { rows: MonthRow[]; currency: string }) {
    const max = Math.max(...rows.map((r) => r.revenue), 1);
    const total = rows.reduce((sum, r) => sum + r.revenue, 0);

    return (
        <Panel title="Mois par mois" description="Les 12 derniers mois jusqu’à la fin de la période, avec les filtres de site, d’hôtesse et d’événement.">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                            <th className="px-5 py-3">Mois</th>
                            <th className="px-3 py-3">Chiffre d’affaires</th>
                            <th className="px-3 py-3 text-right">Unités</th>
                            <th className="px-3 py-3 text-right">Rapports</th>
                            <th className="px-5 py-3 text-right">vs mois précédent</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {[...rows].reverse().map((r) => (
                            <tr key={r.date} className="hover:bg-slate-50/60">
                                <td className="whitespace-nowrap px-5 py-2.5 font-medium text-ink">{monthName(r.date)}</td>
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <span className="w-28 shrink-0 tabular-nums text-ink">{money(r.revenue, currency)}</span>
                                        <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-motriks" style={{ width: `${(r.revenue / max) * 100}%` }} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{number.format(r.units_sold)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{number.format(r.reports_count)}</td>
                                <td className="px-5 py-2.5 text-right"><Variation value={r.variation} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-slate-200 text-sm font-semibold text-ink">
                            <td className="px-5 py-3">Total 12 mois</td>
                            <td className="px-3 py-3 tabular-nums">{money(total, currency)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{number.format(rows.reduce((s, r) => s + r.units_sold, 0))}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{number.format(rows.reduce((s, r) => s + r.reports_count, 0))}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Panel>
    );
}
