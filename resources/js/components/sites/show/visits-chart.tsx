import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { type ChartData, type Period } from '@/components/sites/show/types';
import { PERIOD_LABELS } from '@/components/sites/show/constants';
import { Section } from '@/components/sites/show/ui';

/* -------------------------------------------------------------------------- */
/*  Graphique d'activité                                                      */
/* -------------------------------------------------------------------------- */

export function VisitsChart({ chart }: { chart: ChartData }) {
    const [period, setPeriod] = useState<Period>('month');
    const data = chart[period];

    return (
        <Section
            title="Activité"
            description="Nombre de visites sur la période"
            actions={
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={cn(
                                'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                                period === p
                                    ? 'bg-white text-ink shadow-sm'
                                    : 'text-slate-500 hover:text-ink',
                            )}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="px-2 pt-4 pb-4">
                {data.every((d) => d.count === 0) ? (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                        Aucune visite sur cette période
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={data}
                            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                interval={period === 'month' ? 4 : 0}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 12,
                                    border: '1px solid #e2e8f0',
                                    fontSize: 12,
                                    boxShadow:
                                        '0 8px 24px rgb(15 23 42 / 0.08)',
                                }}
                                formatter={(v) => [
                                    `${Number(v)} visite${Number(v) > 1 ? 's' : ''}`,
                                    '',
                                ]}
                                labelStyle={{
                                    color: '#334155',
                                    fontWeight: 600,
                                }}
                                cursor={{ fill: '#ecfdf3' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="#039855"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={36}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Section>
    );
}
