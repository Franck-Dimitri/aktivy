import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from '@/components/page/page';
import { bucketLabel, compactMoney, day, money } from './format';

export type TimelinePoint = {
    date: string;
    revenue: number;
    units_sold: number;
    previous_date: string | null;
    previous_revenue: number | null;
};

// Période actuelle : vert Motriks plein ; période précédente : bleu en pointillé.
// Couple validé (lisibilité, daltonisme, contraste) sur fond blanc.
const CURRENT = '#3B6D11';
const PREVIOUS = '#2a78d6';

type TooltipProps = {
    active?: boolean;
    payload?: { payload: TimelinePoint }[];
    currency: string;
    granularity: string;
};

function ChartTooltip({ active, payload, currency, granularity }: TooltipProps) {
    if (!active || !payload?.length) return null;

    const p = payload[0].payload;

    return (
        <div className="min-w-48 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg shadow-slate-900/10">
            <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-500">
                    <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CURRENT }} />
                    {bucketLabel(p.date, granularity)}
                </span>
                <span className="font-semibold tabular-nums text-ink">{money(p.revenue, currency)}</span>
            </div>
            {p.previous_date && (
                <div className="mt-1.5 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-slate-500">
                        <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: PREVIOUS }} />
                        {granularity === 'day' ? day(p.previous_date) : bucketLabel(p.previous_date, granularity)}
                    </span>
                    <span className="tabular-nums text-slate-600">{money(p.previous_revenue ?? 0, currency)}</span>
                </div>
            )}
        </div>
    );
}

export function EvolutionChart({ points, granularity, currency, totals }: {
    points: TimelinePoint[];
    granularity: string;
    currency: string;
    totals: { current: number; previous: number };
}) {
    const step = { day: 'jour', week: 'semaine', month: 'mois' }[granularity] ?? 'jour';

    return (
        <Panel title="Évolution du chiffre d’affaires" description={`Par ${step}, comparé à la période précédente de même durée.`}>
            <div className="flex flex-col gap-3 p-4 sm:p-5">
                {/* Légende : chaque série avec son total, l'identité ne repose pas que sur la couleur */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <span className="flex items-center gap-2 text-slate-500">
                        <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: CURRENT }} />
                        Période sélectionnée
                        <span className="font-semibold tabular-nums text-ink">{money(totals.current, currency)}</span>
                    </span>
                    <span className="flex items-center gap-2 text-slate-500">
                        <span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: PREVIOUS }} />
                        Période précédente
                        <span className="font-semibold tabular-nums text-ink">{money(totals.previous, currency)}</span>
                    </span>
                </div>

                <div className="h-64 w-full sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(d: string) => bucketLabel(d, granularity)}
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                minTickGap={24}
                            />
                            <YAxis
                                tickFormatter={(v: number) => compactMoney(v)}
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                width={44}
                            />
                            <Tooltip
                                content={<ChartTooltip currency={currency} granularity={granularity} />}
                                cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="previous_revenue"
                                stroke={PREVIOUS}
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke={CURRENT}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Panel>
    );
}
