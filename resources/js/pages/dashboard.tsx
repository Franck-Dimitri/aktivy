import { Head, Link } from '@inertiajs/react';
import { Activity, ArrowUpRight, Plus, Store, Users } from 'lucide-react';
import { useId, useState, type MouseEvent } from 'react';
import { ActionLink } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { create as personnelCreate } from '@/routes/personnel';
import { index as sitesIndex, create as siteCreate, show as siteShow } from '@/routes/sites';

type Stats = {
    sites_total: number;
    sites_active: number;
    staff_total: number;
    staff_on_site: number;
    visits_today: number;
    visits_week: number;
    revenue_today: number;
    revenue_week: number;
    units_sold_today: number;
    reports_today: number;
};

type RecentVisit = {
    id: number;
    agent_name: string;
    site_name: string;
    checked_in_at: string;
    status: string;
    status_label: string;
};

type RecentSite = {
    id: number;
    name: string;
    type_label: string;
    city: string;
    status: string;
    status_label: string;
    last_visit_at: string;
    affectations: number;
};

/** Optionnel : série journalière (ex. 7 derniers jours). Sans elle, la courbe n'est pas affichée. */
type TrendPoint = { label: string; visits: number; revenue?: number };

type Props = {
    stats: Stats | null;
    recent_visits: RecentVisit[];
    recent_sites: RecentSite[];
    trend?: TrendPoint[];
    auth: { user: { name: string; role: string }; company?: { name: string } };
};

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} K`;
    return amount.toFixed(0);
}

const visitStatusTone: Record<string, StatusTone> = {
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
    active: 'success',
};

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function LiveDot({ className }: { className?: string }) {
    return (
        <span className={cn('relative flex size-2 shrink-0', className)}>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
    );
}

/* ───────────────────── Jauge circulaire ───────────────────── */

function RingGauge({ value, label, caption, live }: { value: number; label: string; caption: string; live?: boolean }) {
    const pct = Math.min(100, Math.max(0, value));
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative size-28">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-slate-100" />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pct / 100)}
                        className="stroke-aktivy transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tracking-tight text-ink tabular-nums">
                    {Math.round(pct)}%
                </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
                {live && <LiveDot />}
                {label}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{caption}</p>
        </div>
    );
}

/* ───────────────── Comparaison aujourd'hui / moyenne ───────────────── */

function Compare({ label, today, average, format, unit }: { label: string; today: number; average: number; format: (n: number) => string; unit?: string }) {
    const max = Math.max(today, average, 1);
    const delta = average > 0 ? Math.round(((today - average) / average) * 100) : null;

    return (
        <div className="rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                {delta !== null && (
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                            delta >= 0 ? 'bg-green-100 text-aktivy-deep' : 'bg-slate-200/70 text-slate-600',
                        )}
                    >
                        {delta > 0 ? '+' : ''}
                        {delta} %
                    </span>
                )}
            </div>

            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">
                {format(today)}
                {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
            </p>

            <div className="relative mt-4 h-1.5 rounded-full bg-slate-200/70" role="img" aria-label={`${label} : ${format(today)} aujourd'hui, moyenne ${format(average)}`}>
                <div className="h-full rounded-full bg-aktivy transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${(today / max) * 100}%` }} />
                <span className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-slate-500" style={{ left: `${(average / max) * 100}%` }} />
            </div>

            <p className="mt-2 text-xs text-slate-500">
                Moyenne <span className="font-medium tabular-nums text-slate-700">{format(average)}</span> / jour
            </p>
        </div>
    );
}

/* ───────────────────────── Courbe (optionnelle) ───────────────────────── */

function TrendChart({ data }: { data: TrendPoint[] }) {
    const gradientId = useId();
    const hasRevenue = data.some((d) => d.revenue !== undefined);
    const [metric, setMetric] = useState<'visits' | 'revenue'>('visits');
    const [active, setActive] = useState<number | null>(null);

    const values = data.map((d) => (metric === 'revenue' ? (d.revenue ?? 0) : d.visits));
    const max = Math.max(...values, 1);
    const points = values.map((v, i) => ({ x: (i / (data.length - 1)) * 100, y: 90 - (v / max) * 76 }));

    const line = points
        .map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const mx = (prev.x + p.x) / 2;
            return `C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
        })
        .join(' ');
    const area = `${line} L 100 90 L 0 90 Z`;

    const fmt = (v: number) => (metric === 'revenue' ? `${formatCurrency(v)} FCFA` : `${v.toLocaleString('fr-FR')} visite${v > 1 ? 's' : ''}`);

    const onMove = (e: MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - r.left) / r.width;
        setActive(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
    };

    const activePoint = active !== null ? points[active] : null;

    return (
        <div className="mt-6">
            {hasRevenue && (
                <div className="mb-3 flex justify-end">
                    <div role="group" aria-label="Indicateur" className="inline-flex rounded-xl bg-slate-100 p-1">
                        {(['visits', 'revenue'] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMetric(m)}
                                aria-pressed={metric === m}
                                className={cn(
                                    'h-7 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                    metric === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {m === 'visits' ? 'Visites' : "Chiffre d'affaires"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative h-44" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
                <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[14, 52, 90].map((y) => (
                        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                    ))}
                    <path d={area} fill={`url(#${gradientId})`} />
                    <path d={line} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>

                {activePoint && active !== null && (
                    <>
                        <span
                            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-aktivy"
                            style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }}
                        />
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3 py-2 text-center shadow-lg"
                            style={{ left: `clamp(14%, ${activePoint.x}%, 86%)`, top: `calc(${activePoint.y}% - 14px)` }}
                        >
                            <p className="text-[11px] text-slate-400">{data[active].label}</p>
                            <p className="text-xs font-semibold whitespace-nowrap text-white tabular-nums">{fmt(values[active])}</p>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400">
                {data.map((d) => (
                    <span key={d.label}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function Dashboard({ stats, recent_visits, recent_sites, trend, auth }: Props) {
    const firstName = auth?.user?.name?.split(' ')[0] ?? '';
    const companyName = auth?.company?.name;
    const todayRaw = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

    const description = [firstName ? `Bonjour ${firstName}` : 'Bonjour', companyName, today].filter(Boolean).join(' · ');

    const presence = stats && stats.staff_total > 0 ? (stats.staff_on_site / stats.staff_total) * 100 : 0;
    const sitesRate = stats && stats.sites_total > 0 ? (stats.sites_active / stats.sites_total) * 100 : 0;

    return (
        <>
            <Head title="Tableau de bord" />
            <GlowStyles />

            <Page
                title="Tableau de bord"
                description={description}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <ActionLink href={personnelCreate().url} variant="secondary" icon={<Users />}>
                            Nouveau membre
                        </ActionLink>
                        <ActionLink href={siteCreate().url} icon={<Plus />}>
                            Nouveau site
                        </ActionLink>
                    </div>
                }
            >
                {stats === null ? (
                    <Panel>
                        <EmptyState
                            icon={Activity}
                            title="Aucune donnée pour le moment"
                            description="Votre tableau de bord se remplira dès les premières activités de votre équipe."
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Chiffres clés */}
                        <MetricStrip
                            items={[
                                {
                                    label: "Chiffre d'affaires",
                                    value: (
                                        <>
                                            {formatCurrency(stats.revenue_today)}
                                            <span className="text-sm font-medium text-slate-400">FCFA</span>
                                        </>
                                    ),
                                    sub: `${formatCurrency(stats.revenue_week)} FCFA cette semaine`,
                                },
                                { label: "Visites aujourd'hui", value: stats.visits_today, sub: `${stats.visits_week} cette semaine` },
                                { label: 'Unités vendues', value: stats.units_sold_today, sub: "aujourd'hui" },
                                { label: 'Rapports soumis', value: stats.reports_today, sub: "aujourd'hui" },
                            ]}
                        />

                        {/* Performance + présence */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            <GlowCard className="h-full lg:col-span-2" contentClassName="flex h-full flex-col p-6">
                                <div>
                                    <h3 className="text-base font-semibold text-ink">Performance du jour</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">Comparée à la moyenne quotidienne de la semaine.</p>
                                </div>

                                {trend && trend.length > 1 && <TrendChart data={trend} />}

                                <div className={cn('grid gap-4 sm:grid-cols-2', trend && trend.length > 1 ? 'mt-6 border-t border-slate-100 pt-6' : 'mt-6')}>
                                    <Compare
                                        label="Visites"
                                        today={stats.visits_today}
                                        average={stats.visits_week / 7}
                                        format={(n) => (Number.isInteger(n) ? n.toString() : n.toFixed(1).replace('.', ','))}
                                    />
                                    <Compare
                                        label="Chiffre d'affaires"
                                        today={stats.revenue_today}
                                        average={stats.revenue_week / 7}
                                        format={formatCurrency}
                                        unit="FCFA"
                                    />
                                </div>
                            </GlowCard>

                            <GlowCard className="h-full" contentClassName="flex h-full flex-col p-6">
                                <div>
                                    <h3 className="text-base font-semibold text-ink">Équipe et sites</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">État du terrain en ce moment.</p>
                                </div>

                                <div className="my-auto grid grid-cols-2 gap-4 py-6">
                                    <RingGauge
                                        value={presence}
                                        label="En poste"
                                        caption={`${stats.staff_on_site} sur ${stats.staff_total}`}
                                        live={stats.staff_on_site > 0}
                                    />
                                    <RingGauge value={sitesRate} label="Sites actifs" caption={`${stats.sites_active} sur ${stats.sites_total}`} />
                                </div>
                            </GlowCard>
                        </div>

                        {/* Activité récente + sites */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <Panel title="Activité récente" description="Les dernières prises de poste enregistrées.">
                                    {recent_visits.length === 0 ? (
                                        <EmptyState
                                            icon={Activity}
                                            title="Aucune activité"
                                            description="Les prises de poste de vos hôtesses apparaîtront ici."
                                        />
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {recent_visits.map((v) => (
                                                <li key={v.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-green-50/40">
                                                    <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xs font-bold text-aktivy-deep ring-1 ring-inset ring-green-600/10">
                                                        {initials(v.agent_name)}
                                                        {v.status === 'in_progress' && <LiveDot className="absolute -top-0.5 -right-0.5 [&>span:last-child]:ring-2 [&>span:last-child]:ring-white" />}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-ink">{v.agent_name}</p>
                                                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                                            <Store className="size-3 shrink-0 text-slate-400" />
                                                            <span className="truncate">{v.site_name}</span>
                                                            <span className="text-slate-300">·</span>
                                                            <span className="shrink-0">{v.checked_in_at}</span>
                                                        </p>
                                                    </div>

                                                    <StatusBadge tone={visitStatusTone[v.status] ?? 'neutral'}>{v.status_label}</StatusBadge>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Panel>
                            </div>

                            <Panel
                                title="Sites"
                                actions={
                                    <Link
                                        href={sitesIndex().url}
                                        className="inline-flex items-center gap-1 rounded-full bg-aktivy-soft px-3 py-1 text-xs font-semibold text-aktivy-deep transition-colors hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                    >
                                        Voir tout
                                        <ArrowUpRight className="size-3" />
                                    </Link>
                                }
                            >
                                {recent_sites.length === 0 ? (
                                    <EmptyState
                                        icon={Store}
                                        title="Aucun site"
                                        description="Créez votre premier point de vente."
                                        action={
                                            <ActionLink href={siteCreate().url} icon={<Plus />}>
                                                Créer un site
                                            </ActionLink>
                                        }
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {recent_sites.map((s) => (
                                            <li key={s.id}>
                                                <Link
                                                    href={siteShow(s.id).url}
                                                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-green-50/40 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none focus-visible:ring-inset"
                                                >
                                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-aktivy-deep ring-1 ring-inset ring-green-600/10 transition-colors group-hover:bg-aktivy group-hover:text-white group-hover:ring-0">
                                                        <Store className="size-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-aktivy-deep">{s.name}</p>
                                                        <p className="truncate text-xs text-slate-500">
                                                            {s.city} · {s.type_label}
                                                        </p>
                                                    </div>
                                                    <StatusBadge tone={s.status === 'active' ? 'success' : 'neutral'}>{s.status_label}</StatusBadge>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>
                    </div>
                )}
            </Page>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Tableau de bord',
            href: dashboard(),
        },
    ],
};