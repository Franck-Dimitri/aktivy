import { Head, Link, router } from '@inertiajs/react';
import {
    BadgeCheck,
    CalendarRange,
    Clock,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Store,
    Timer,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import {
    index as personnelIndex,
    edit as personnelEdit,
    show as personnelShow,
    destroy as personnelDestroy,
} from '@/routes/personnel';
import { show as siteShow } from '@/routes/sites';
import { dashboard } from '@/routes';
import type { StaffAffectation, StaffMemberDetail, StaffStats, StaffVisit } from '@/types';

type Props = {
    member: StaffMemberDetail;
    stats: StaffStats;
    affectations: StaffAffectation[];
    recent_visits: StaffVisit[];
};

const visitStatusTone: Record<string, StatusTone> = {
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
};

function formatDuration(minutes: number | null): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function StatBlock({ icon: Icon, label, value, sub }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-aktivy-soft text-aktivy-deep">
                <Icon className="size-4" />
            </div>
            <div>
                <p className="text-xl font-bold text-ink">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
                {sub && <p className="text-xs text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}

export default function PersonnelShow({ member, stats, affectations, recent_visits }: Props) {
    const confirmDelete = () => {
        if (confirm(`Archiver « ${member.name} » ? Ses visites et affectations seront conservées.`)) {
            router.delete(personnelDestroy({ personnel: member.id }).url);
        }
    };

    const completionRate = stats.total_visits > 0
        ? Math.round((stats.completed_visits / stats.total_visits) * 100)
        : 0;

    return (
        <>
            <Head title={member.name} />

            <Page
                title={member.name}
                description={member.role_label}
                actions={
                    <div className="flex items-center gap-2">
                        <Link
                            href={personnelEdit({ personnel: member.id }).url}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            <Pencil className="size-3.5" />
                            Modifier
                        </Link>
                        <button
                            onClick={confirmDelete}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        >
                            <Trash2 className="size-3.5" />
                            Archiver
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* Stats de performance */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatBlock icon={BadgeCheck} label="Visites totales" value={stats.total_visits} />
                        <StatBlock icon={TrendingUp} label="Ce mois-ci" value={stats.visits_30d} sub="30 derniers jours" />
                        <StatBlock icon={Clock} label="Durée moyenne" value={formatDuration(stats.avg_duration)} sub="par visite" />
                        <StatBlock icon={BadgeCheck} label="Taux de complétion" value={`${completionRate}%`} sub={`${stats.completed_visits} complètes`} />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Colonne principale */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            {/* Informations */}
                            <Panel title="Informations">
                                <dl className="divide-y divide-slate-100 px-5">
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">Statut</dt>
                                        <dd>
                                            <StatusBadge tone={member.status === 'active' ? 'success' : 'warning'}>
                                                {member.status_label}
                                            </StatusBadge>
                                        </dd>
                                    </div>
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">Rôle</dt>
                                        <dd className="font-medium text-ink">{member.role_label}</dd>
                                    </div>
                                    {member.phone && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">Téléphone</dt>
                                            <dd>
                                                <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 font-medium text-aktivy-deep hover:underline">
                                                    <Phone className="size-3.5" />
                                                    {member.phone}
                                                </a>
                                            </dd>
                                        </div>
                                    )}
                                    {member.email && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">E-mail</dt>
                                            <dd>
                                                <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 font-medium text-aktivy-deep hover:underline">
                                                    <Mail className="size-3.5" />
                                                    {member.email}
                                                </a>
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </Panel>

                            {/* Visites récentes */}
                            <Panel
                                title="Historique des visites"
                                description="Les 10 dernières prises de poste."
                            >
                                {recent_visits.length === 0 ? (
                                    <EmptyState
                                        icon={Timer}
                                        title="Aucune visite enregistrée"
                                        description="Les pointages de ce membre apparaîtront ici."
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {recent_visits.map((visit) => (
                                            <li key={visit.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                                    <Store className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-ink">{visit.site_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {visit.checked_in_at}
                                                        {visit.checked_out_at && ` → ${visit.checked_out_at}`}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3">
                                                    {visit.duration_minutes !== null && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Clock className="size-3" />
                                                            {formatDuration(visit.duration_minutes)}
                                                        </span>
                                                    )}
                                                    <StatusBadge tone={visitStatusTone[visit.status] ?? 'neutral'}>
                                                        {visit.status_label}
                                                    </StatusBadge>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>

                        {/* Colonne latérale */}
                        <div className="flex flex-col gap-6">
                            {/* Sites affectés */}
                            <Panel
                                title="Sites affectés"
                                actions={
                                    <span className="text-sm text-slate-400">{affectations.length}</span>
                                }
                            >
                                {affectations.length === 0 ? (
                                    <EmptyState
                                        icon={CalendarRange}
                                        title="Aucune affectation"
                                        description="Ce membre n'est affecté à aucun site."
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {affectations.map((a) => (
                                            <li key={a.id} className="px-5 py-3">
                                                <Link
                                                    href={siteShow({ site: a.site_id }).url}
                                                    className="group flex items-start gap-3"
                                                >
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-aktivy-soft text-aktivy-deep">
                                                        <Store className="size-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-ink group-hover:text-aktivy-deep">
                                                            {a.site_name}
                                                        </p>
                                                        <p className="flex items-center gap-1 text-xs text-slate-500">
                                                            <MapPin className="size-3" />
                                                            {a.site_city} · {a.site_type}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            Depuis le {a.starts_on}
                                                            {a.ends_on && ` · jusqu'au ${a.ends_on}`}
                                                        </p>
                                                        {a.slot_start && a.slot_end && (
                                                            <p className="text-xs text-slate-400">
                                                                <Clock className="mr-1 inline size-3" />
                                                                {a.slot_start} – {a.slot_end}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {a.is_current && (
                                                        <StatusBadge tone="success">Actif</StatusBadge>
                                                    )}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>
                    </div>
                </div>
            </Page>
        </>
    );
}

PersonnelShow.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};
