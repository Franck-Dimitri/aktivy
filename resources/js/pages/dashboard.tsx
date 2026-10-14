import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    MapPin,
    Plus,
    Store,
    TrendingUp,
    Users,
} from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { index as sitesIndex, create as siteCreate, show as siteShow } from '@/routes/sites';
import { create as personnelCreate } from '@/routes/personnel';
import { dashboard } from '@/routes';

type Stats = {
    sites_total: number;
    sites_active: number;
    staff_total: number;
    staff_on_site: number;
    visits_today: number;
    visits_week: number;
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

type Props = {
    stats: Stats | null;
    recent_visits: RecentVisit[];
    recent_sites: RecentSite[];
    auth: { user: { name: string; role: string }; company?: { name: string } };
};

const visitStatusTone: Record<string, StatusTone> = {
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
    active: 'success',
};

function KpiCard({
    icon: Icon,
    label,
    value,
    sub,
    highlight,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    sub?: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
                highlight
                    ? 'border-aktivy/30 bg-aktivy-soft'
                    : 'border-slate-200 bg-white'
            }`}
        >
            <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    highlight ? 'bg-aktivy/20 text-aktivy-deep' : 'bg-slate-100 text-slate-500'
                }`}
            >
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-bold text-ink">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                {sub && <p className="text-xs text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}

export default function Dashboard({ stats, recent_visits, recent_sites }: Props) {
    const hasData = stats !== null;

    return (
        <>
            <Head title="Tableau de bord" />

            <Page
                title="Tableau de bord"
                description={hasData ? "Vue d'ensemble de votre activité." : undefined}
            >
                {hasData && stats && (
                    <div className="flex flex-col gap-6">
                        {/* KPI row */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            <KpiCard
                                icon={Store}
                                label="Sites actifs"
                                value={stats.sites_active}
                                sub={`${stats.sites_total} au total`}
                            />
                            <KpiCard
                                icon={Users}
                                label="Équipe"
                                value={stats.staff_total}
                                sub="membres terrain"
                            />
                            <KpiCard
                                icon={MapPin}
                                label="En poste"
                                value={stats.staff_on_site}
                                sub="en ce moment"
                                highlight={stats.staff_on_site > 0}
                            />
                            <KpiCard
                                icon={Activity}
                                label="Visites aujourd'hui"
                                value={stats.visits_today}
                            />
                            <KpiCard
                                icon={TrendingUp}
                                label="Cette semaine"
                                value={stats.visits_week}
                                sub="visites"
                            />
                            <div className="rounded-xl border border-dashed border-slate-200 p-4">
                                <p className="text-xs font-semibold text-slate-400">Accès rapide</p>
                                <div className="mt-2 flex flex-col gap-1.5">
                                    <Link
                                        href={siteCreate().url}
                                        className="flex items-center gap-1.5 text-xs font-medium text-aktivy-deep hover:underline"
                                    >
                                        <Plus className="size-3" />
                                        Nouveau site
                                    </Link>
                                    <Link
                                        href={personnelCreate().url}
                                        className="flex items-center gap-1.5 text-xs font-medium text-aktivy-deep hover:underline"
                                    >
                                        <Plus className="size-3" />
                                        Nouveau membre
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Activité récente */}
                            <div className="lg:col-span-2">
                                <Panel
                                    title="Activité récente"
                                    description="Les dernières prises de poste enregistrées."
                                >
                                    {recent_visits.length === 0 ? (
                                        <EmptyState
                                            icon={Activity}
                                            title="Aucune activité"
                                            description="Les prises de poste de vos hôtesses apparaîtront ici."
                                        />
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {recent_visits.map((v) => (
                                                <li
                                                    key={v.id}
                                                    className="flex items-center gap-3 px-5 py-3 text-sm"
                                                >
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-xs font-bold text-aktivy-deep">
                                                        {v.agent_name
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .slice(0, 2)
                                                            .join('')
                                                            .toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-ink">
                                                            {v.agent_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {v.site_name} · {v.checked_in_at}
                                                        </p>
                                                    </div>
                                                    <StatusBadge
                                                        tone={visitStatusTone[v.status] ?? 'neutral'}
                                                    >
                                                        {v.status_label}
                                                    </StatusBadge>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Panel>
                            </div>

                            {/* Sites récents */}
                            <div>
                                <Panel
                                    title="Sites"
                                    actions={
                                        <Link
                                            href={sitesIndex().url}
                                            className="text-xs font-semibold text-aktivy-deep hover:underline"
                                        >
                                            Voir tout
                                        </Link>
                                    }
                                >
                                    {recent_sites.length === 0 ? (
                                        <EmptyState
                                            icon={Store}
                                            title="Aucun site"
                                            description="Créez votre premier point de vente."
                                            action={
                                                <Link
                                                    href={siteCreate().url}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-aktivy px-3 text-xs font-semibold text-ink hover:bg-[#46b52b]"
                                                >
                                                    <Plus className="size-3" />
                                                    Créer un site
                                                </Link>
                                            }
                                        />
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {recent_sites.map((s) => (
                                                <li key={s.id}>
                                                    <Link
                                                        href={siteShow(s.id).url}
                                                        className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                                                    >
                                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-aktivy-soft text-aktivy-deep">
                                                            <Store className="size-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold text-ink group-hover:text-aktivy-deep">
                                                                {s.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {s.city} · {s.type_label}
                                                            </p>
                                                        </div>
                                                        <StatusBadge
                                                            tone={
                                                                s.status === 'active'
                                                                    ? 'success'
                                                                    : 'neutral'
                                                            }
                                                        >
                                                            {s.status_label}
                                                        </StatusBadge>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Panel>
                            </div>
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
