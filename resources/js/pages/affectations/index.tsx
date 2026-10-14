import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarRange,
    Clock,
    MapPin,
    Pencil,
    Plus,
    Store,
    Trash2,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import {
    index as affectationsIndex,
    create as affectationCreate,
    edit as affectationEdit,
    destroy as affectationDestroy,
} from '@/routes/affectations';
import { show as siteShow } from '@/routes/sites';
import { show as personnelShow } from '@/routes/personnel';
import { dashboard } from '@/routes';
import type { AffectationListItem, AffectationStats } from '@/types';

type Props = {
    affectations: AffectationListItem[];
    stats: AffectationStats;
};

const statusTone: Record<string, StatusTone> = {
    active: 'success',
    completed: 'neutral',
    cancelled: 'danger',
};

const roleShort: Record<string, string> = {
    field_agent: 'Hôtesse',
    supervisor: 'Superviseur',
    accountant: 'Comptable',
};

type FilterStatus = 'all' | 'active' | 'completed' | 'cancelled';

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div
            className={`rounded-xl border p-4 ${
                highlight ? 'border-aktivy/30 bg-aktivy-soft' : 'border-slate-200 bg-white'
            }`}
        >
            <p className="text-2xl font-bold text-ink">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        </div>
    );
}

export default function AffectationsIndex({ affectations, stats }: Props) {
    const [filter, setFilter] = useState<FilterStatus>('all');

    const filtered = filter === 'all'
        ? affectations
        : affectations.filter((a) => a.status === filter);

    const confirmDelete = (a: AffectationListItem) => {
        if (confirm(`Supprimer l'affectation de ${a.agent_name} sur ${a.site_name} ?`)) {
            router.delete(affectationDestroy({ affectation: a.id }).url);
        }
    };

    const filters: { value: FilterStatus; label: string; count: number }[] = [
        { value: 'all',       label: 'Toutes',    count: stats.total },
        { value: 'active',    label: 'Actives',   count: stats.active },
        { value: 'completed', label: 'Terminées', count: stats.completed },
    ];

    return (
        <>
            <Head title="Affectations" />

            <Page
                title="Affectations"
                description="Qui travaille où et à quelle période."
                actions={
                    <Link
                        href={affectationCreate().url}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                    >
                        <Plus className="size-4" />
                        Nouvelle affectation
                    </Link>
                }
            >
                {affectations.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={CalendarRange}
                            title="Aucune affectation"
                            description="Assignez vos hôtesses et superviseurs à vos sites."
                            action={
                                <Link
                                    href={affectationCreate().url}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink hover:bg-[#46b52b]"
                                >
                                    <Plus className="size-4" />
                                    Créer la première affectation
                                </Link>
                            }
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <StatCard label="Total"          value={stats.total} />
                            <StatCard label="Actives"        value={stats.active} highlight={stats.active > 0} />
                            <StatCard label="En cours"       value={stats.current} highlight={stats.current > 0} />
                            <StatCard label="Terminées"      value={stats.completed} />
                        </div>

                        {/* Filtre par statut */}
                        <div className="flex gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilter(f.value)}
                                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                                        filter === f.value
                                            ? 'border-aktivy bg-aktivy-soft text-aktivy-deep'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {f.label}
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                        {f.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Liste */}
                        <Panel>
                            {filtered.length === 0 ? (
                                <EmptyState
                                    icon={CalendarRange}
                                    title="Aucune affectation dans ce filtre"
                                    description="Essayez un autre filtre."
                                />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {filtered.map((a) => (
                                        <li key={a.id} className="flex items-center gap-4 px-5 py-4">
                                            {/* Avatar agent */}
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-xs font-bold text-aktivy-deep">
                                                {a.agent_name
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase()}
                                            </div>

                                            {/* Infos */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                    <Link
                                                        href={personnelShow({ personnel: a.agent_id }).url}
                                                        className="text-sm font-semibold text-ink hover:text-aktivy-deep hover:underline"
                                                    >
                                                        {a.agent_name}
                                                    </Link>
                                                    <StatusBadge tone="info">
                                                        {roleShort[a.agent_role] ?? a.agent_role}
                                                    </StatusBadge>
                                                    {a.is_current && (
                                                        <StatusBadge tone="success">En poste</StatusBadge>
                                                    )}
                                                </div>

                                                {/* Site */}
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                    <Link
                                                        href={siteShow({ site: a.site_id }).url}
                                                        className="flex items-center gap-1 font-medium hover:text-aktivy-deep hover:underline"
                                                    >
                                                        <Store className="size-3" />
                                                        {a.site_name}
                                                        <span className="font-normal text-slate-400">
                                                            · {a.site_city}
                                                        </span>
                                                    </Link>

                                                    <span className="flex items-center gap-1">
                                                        <CalendarRange className="size-3" />
                                                        {a.starts_on}
                                                        {a.ends_on && ` → ${a.ends_on}`}
                                                        {!a.ends_on && ' → permanent'}
                                                    </span>

                                                    {a.slot_start && a.slot_end && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="size-3" />
                                                            {a.slot_start} – {a.slot_end}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Statut + actions */}
                                            <div className="flex shrink-0 items-center gap-2">
                                                <StatusBadge tone={statusTone[a.status] ?? 'neutral'}>
                                                    {a.status_label}
                                                </StatusBadge>
                                                <Link
                                                    href={affectationEdit({ affectation: a.id }).url}
                                                    className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Link>
                                                <button
                                                    onClick={() => confirmDelete(a)}
                                                    className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>
                )}
            </Page>
        </>
    );
}

AffectationsIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Affectations', href: affectationsIndex() },
    ],
};
