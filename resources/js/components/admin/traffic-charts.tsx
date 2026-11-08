import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { number } from '@/pages/reports/format';

/**
 * Couleurs du volet « Trafic du site ». Motriks est en thème clair uniquement.
 * Trio catégoriel validé (scripts/validate_palette.js, skill dataviz) sur fond blanc :
 * bande de luminance, chroma, séparation daltonisme, vision normale et contraste ≥ 3:1.
 */
export const SERIES = {
    green: '#039855',
    blue: '#2a78d6',
    orange: '#eb6834',
} as const;

const AXIS = { fontSize: 11, fill: '#64748b' };
const GRID = '#f1f5f9';

export type DailyPoint = { date: string; label: string; long: string; views: number; visits: number };
export type HourPoint = { hour: number; views: number };

/** Graduation propre : nombres en entier sous 10 000, compacts au-delà. */
const tick = (v: number) =>
    v >= 10000 ? new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v) : number.format(v);

/** Graduations rondes (pas de 1, 2 ou 5 × 10ⁿ), quatre intervalles environ, à partir de zéro. */
export function niceTicks(max: number): number[] {
    if (max <= 0) return [0, 1];
    const rough = max / 4;
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
    const top = Math.ceil(max / step) * step;

    return Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step);
}

function TooltipCard({ title, rows }: { title: string; rows: { color: string; label: string; value: number }[] }) {
    return (
        <div className="min-w-44 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg shadow-slate-900/10">
            <p className="mb-1.5 font-medium text-slate-500">{title}</p>
            {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-5 py-0.5">
                    <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.label}
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{number.format(r.value)}</span>
                </div>
            ))}
        </div>
    );
}

/** Légende des deux séries de la courbe : l'identité ne repose jamais sur la seule couleur. */
export function TrendLegend({ visits, views }: { visits: number; views: number }) {
    return (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <span className="flex items-center gap-2 text-slate-500">
                <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: SERIES.green }} />
                Visites
                <span className="font-semibold text-ink tabular-nums">{number.format(visits)}</span>
            </span>
            <span className="flex items-center gap-2 text-slate-500">
                <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: SERIES.blue }} />
                Pages vues
                <span className="font-semibold text-ink tabular-nums">{number.format(views)}</span>
            </span>
        </div>
    );
}

/** Visites (vert, voile léger) et pages vues (bleu) par jour : même unité, un seul axe. */
export function TrendChart({ points }: { points: DailyPoint[] }) {
    const ticks = niceTicks(Math.max(...points.map((p) => Math.max(p.views, p.visits))));

    return (
        <div className="h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="traffic-visits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SERIES.green} stopOpacity={0.12} />
                            <stop offset="100%" stopColor={SERIES.green} stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={28} />
                    <YAxis
                        tick={AXIS}
                        tickFormatter={tick}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        ticks={ticks}
                        domain={[0, ticks[ticks.length - 1]]}
                        interval={0}
                    />
                    <Tooltip
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p = payload[0].payload as DailyPoint;

                            return (
                                <TooltipCard
                                    title={p.long}
                                    rows={[
                                        { color: SERIES.green, label: 'Visites', value: p.visits },
                                        { color: SERIES.blue, label: 'Pages vues', value: p.views },
                                    ]}
                                />
                            );
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="visits"
                        stroke={SERIES.green}
                        strokeWidth={2}
                        fill="url(#traffic-visits)"
                        activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                        isAnimationActive={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="views"
                        stroke={SERIES.blue}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Pages vues par heure : colonnes fines, une seule teinte ; l'heure de pointe en vert plein. */
export function HoursChart({ hours }: { hours: HourPoint[] }) {
    const peak = Math.max(...hours.map((h) => h.views));
    const ticks = niceTicks(peak);

    return (
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hours} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                        dataKey="hour"
                        tick={AXIS}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        interval={0}
                        tickFormatter={(h: number) => (h % 6 === 0 ? `${h} h` : '')}
                    />
                    <YAxis
                        tick={AXIS}
                        tickFormatter={tick}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        ticks={ticks}
                        domain={[0, ticks[ticks.length - 1]]}
                        interval={0}
                    />
                    <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p = payload[0].payload as HourPoint;

                            return (
                                <TooltipCard
                                    title={`De ${p.hour} h à ${p.hour + 1} h`}
                                    rows={[{ color: SERIES.green, label: 'Pages vues', value: p.views }]}
                                />
                            );
                        }}
                    />
                    <Bar
                        dataKey="views"
                        maxBarSize={24}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                        shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: HourPoint }) => {
                            const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                            const r = Math.min(4, width / 2, height);

                            return (
                                <path
                                    d={`M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`}
                                    fill={payload && payload.views === peak && peak > 0 ? SERIES.green : '#a6dcbf'}
                                />
                            );
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export type Part = { key: string; label: string; visits: number; color: string };

/**
 * Répartition d'un tout (appareils) : barre segmentée fine, sans texte ; les chiffres sont sur les
 * lignes en dessous, chacune avec sa pastille de couleur (pas de légende séparée).
 */
export function SegmentedShare({ parts }: { parts: Part[] }) {
    const total = parts.reduce((s, p) => s + p.visits, 0);
    const visible = parts.filter((p) => p.visits > 0);

    return (
        <div className="flex flex-col gap-4">
            <div
                role="img"
                aria-label={parts.map((p) => `${p.label} ${total ? Math.round((100 * p.visits) / total) : 0} %`).join(', ')}
                className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100"
            >
                {visible.map((p) => (
                    <span
                        key={p.key}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${(100 * p.visits) / total}%`, backgroundColor: p.color }}
                    />
                ))}
            </div>
            <ul className="flex flex-col gap-2.5">
                {parts.map((p) => (
                    <li key={p.key} className="flex items-center gap-3 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="flex-1 text-slate-600">{p.label}</span>
                        <span className="text-slate-400 tabular-nums">{number.format(p.visits)}</span>
                        <span className="w-14 text-right font-semibold text-ink tabular-nums">
                            {total ? Math.round((100 * p.visits) / total) : 0} %
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export type RankedRow = { label: string; visits: number; views: number; share: number; hint?: string };

/** Classement (pages, provenance, navigateurs…) : barres horizontales fines, une seule teinte, plus grand en premier. */
export function RankedList({ rows, empty, className }: { rows: RankedRow[]; empty: string; className?: string }) {
    if (rows.length === 0) {
        return <p className="px-5 py-8 text-center text-sm text-slate-400">{empty}</p>;
    }

    const max = Math.max(...rows.map((r) => r.visits), 1);

    return (
        <ul className={cn('flex flex-col gap-3.5 px-5 py-4', className)}>
            {rows.map((r) => (
                <li key={`${r.label}-${r.hint ?? ''}`} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">
                            <span className="font-medium text-ink">{r.label}</span>
                            {r.hint && <span className="ml-2 font-mono text-xs text-slate-400">{r.hint}</span>}
                        </span>
                        <span className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
                            <span className="text-xs text-slate-400">{number.format(r.visits)}</span>
                            <span className="w-12 text-right font-semibold text-ink">{Math.round(r.share)} %</span>
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${(100 * r.visits) / max}%`, backgroundColor: SERIES.green }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}
