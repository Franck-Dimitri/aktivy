import { Head, Link } from '@inertiajs/react';
import { CalendarRange, Clock, Mail, MapPin, Pencil, Phone, Store, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { dashboard } from '@/routes';
import { index as personnelIndex, destroy as personnelDestroy } from '@/routes/personnel';
import { show as siteShow } from '@/routes/sites';
import type { RoleOption, StaffAffectation, StaffMemberDetail, StaffStats, StaffVisit, StatusOption } from '@/types';
import { EditMemberModal } from './edit-member-modal';

type Props = {
    member: StaffMemberDetail;
    stats: StaffStats;
    affectations: StaffAffectation[];
    recent_visits: StaffVisit[];
    roles: RoleOption[];
    statuses: StatusOption[];
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

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <header className="flex items-center justify-between px-5 pt-4 pb-3">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                {aside}
            </header>
            <div className="border-t border-slate-100">{children}</div>
        </section>
    );
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
    return (
        <div className="flex flex-col gap-1 px-5 py-4">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            <span className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</span>
            {sub && <span className="text-xs text-slate-400">{sub}</span>}
        </div>
    );
}

export default function PersonnelShow({ member, stats, affectations = [], recent_visits = [], roles = [], statuses = [] }: Props) {
    // Ouvre directement le modal quand on arrive depuis l'icône « Modifier » de la liste (?modifier=1)
    const [editing, setEditing] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('modifier'));

    const closeEdit = () => {
        setEditing(false);
        if (typeof window !== 'undefined' && window.location.search.includes('modifier')) {
            window.history.replaceState(window.history.state, '', window.location.pathname);
        }
    };

    const { ask, dialog } = useDeleteDialog<typeof member>({
        getUrl: (m) => personnelDestroy({ personnel: m.id }).url,
        getTitle: (m) => `Supprimer « ${m.name} » ?`,
        getDescription: () => 'Ce membre ne pourra plus se connecter. Ses visites et affectations passées restent consultables.',
        getSuccessMessage: (m) => `${m.name} a été supprimé.`,
        confirmLabel: 'Supprimer',
        icon: Trash2,
    });

    const completionRate = stats.total_visits > 0 ? Math.round((stats.completed_visits / stats.total_visits) * 100) : 0;
    const initials = member.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <>
            <Head title={member.name} />

            <Page
                title={member.name}
                description={member.role_label}
                actions={
                    <>
                        <ActionButton variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>
                            Modifier
                        </ActionButton>
                        <ActionButton
                            variant="secondary"
                            icon={<Trash2 />}
                            onClick={() => ask(member)}
                            className="border-transparent bg-transparent text-red-600 shadow-none hover:bg-red-50"
                        >
                            Supprimer
                        </ActionButton>
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* Carte profil */}
                    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white p-5 sm:flex-row sm:items-center">
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-motriks-soft text-lg font-semibold text-motriks-deep ring-1 ring-green-100">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge tone={member.status === 'active' ? 'success' : 'warning'}>{member.status_label}</StatusBadge>
                                <span className="text-sm text-slate-500">{member.role_label}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                                {member.phone ? (
                                    <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-motriks-deep">
                                        <Phone className="size-3.5 text-slate-400" />
                                        {member.phone}
                                    </a>
                                ) : null}
                                {member.email ? (
                                    <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-motriks-deep">
                                        <Mail className="size-3.5 text-slate-400" />
                                        {member.email}
                                    </a>
                                ) : null}
                                {!member.phone && !member.email && <span className="text-slate-400">Aucune coordonnée renseignée</span>}
                            </div>
                        </div>
                    </div>

                    {/* Chiffres clés */}
                    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white lg:grid-cols-4 lg:divide-y-0">
                        <Metric label="Visites totales" value={stats.total_visits} />
                        <Metric label="Ce mois-ci" value={stats.visits_30d} sub="30 derniers jours" />
                        <Metric label="Durée moyenne" value={formatDuration(stats.avg_duration)} sub="par visite" />
                        <Metric
                            label="Taux de complétion"
                            value={<span className={completionRate >= 80 ? 'text-motriks-deep' : undefined}>{completionRate}%</span>}
                            sub={`${stats.completed_visits} complètes`}
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <Card title="Historique des visites" aside={<span className="text-xs text-slate-400">10 dernières</span>}>
                                {recent_visits.length === 0 ? (
                                    <EmptyState icon={Timer} title="Aucune visite enregistrée" description="Les pointages de ce membre apparaîtront ici." />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {recent_visits.map((visit) => (
                                            <li key={visit.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                                                    <Store className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-ink">{visit.site_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {visit.checked_in_at}
                                                        {visit.checked_out_at && ` → ${visit.checked_out_at}`}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3">
                                                    {visit.duration_minutes !== null && (
                                                        <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                                                            <Clock className="size-3" />
                                                            {formatDuration(visit.duration_minutes)}
                                                        </span>
                                                    )}
                                                    <StatusBadge tone={visitStatusTone[visit.status] ?? 'neutral'}>{visit.status_label}</StatusBadge>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        </div>

                        <Card title="Sites affectés" aside={<span className="text-xs font-medium text-slate-400 tabular-nums">{affectations.length}</span>}>
                            {affectations.length === 0 ? (
                                <EmptyState icon={CalendarRange} title="Aucune affectation" description="Ce membre n'est affecté à aucun site." />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {affectations.map((a) => (
                                        <li key={a.id}>
                                            <Link href={siteShow({ site: a.site_id }).url} className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/80">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                                                    <Store className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-ink group-hover:text-motriks-deep">{a.site_name}</p>
                                                    <p className="flex items-center gap-1 text-xs text-slate-500">
                                                        <MapPin className="size-3" />
                                                        {a.site_city} · {a.site_type}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        Depuis le {a.starts_on}
                                                        {a.ends_on && ` · jusqu'au ${a.ends_on}`}
                                                    </p>
                                                    {a.slot_start && a.slot_end && (
                                                        <p className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Clock className="size-3" />
                                                            {a.slot_start} – {a.slot_end}
                                                        </p>
                                                    )}
                                                </div>
                                                {a.is_current && <StatusBadge tone="success">Actif</StatusBadge>}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </div>
            </Page>

            {editing && <EditMemberModal member={member} roles={roles} statuses={statuses} onClose={closeEdit} />}
            {dialog}
        </>
    );
}

PersonnelShow.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};