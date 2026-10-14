import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, MapPin, Plus, UserCircle2, Users } from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import {
    index as personnelIndex,
    create as personnelCreate,
    show as personnelShow,
} from '@/routes/personnel';
import { dashboard } from '@/routes';
import type { StaffListItem } from '@/types';

type Props = {
    staff: StaffListItem[];
};

const roleTone: Record<string, StatusTone> = {
    supervisor: 'info',
    field_agent: 'success',
    accountant: 'neutral',
};

const statusTone: Record<string, StatusTone> = {
    active: 'success',
    suspended: 'warning',
};

const roleShort: Record<string, string> = {
    supervisor: 'Superviseur',
    field_agent: 'Hôtesse',
    accountant: 'Comptable',
};

export default function PersonnelIndex({ staff }: Props) {
    const byRole = {
        supervisor: staff.filter((s) => s.role === 'supervisor'),
        field_agent: staff.filter((s) => s.role === 'field_agent'),
        accountant: staff.filter((s) => s.role === 'accountant'),
    };

    return (
        <>
            <Head title="Personnel" />

            <Page
                title="Personnel"
                description="Les membres de votre équipe terrain."
                actions={
                    <Link
                        href={personnelCreate().url}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                    >
                        <Plus className="size-4" />
                        Ajouter un membre
                    </Link>
                }
            >
                {staff.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Users}
                            title="Aucun membre pour l'instant"
                            description="Ajoutez vos superviseurs, hôtesses et comptables."
                            action={
                                <Link
                                    href={personnelCreate().url}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                >
                                    <Plus className="size-4" />
                                    Ajouter un membre
                                </Link>
                            }
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Résumé rapide */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <StatCard label="Total" value={staff.length} />
                            <StatCard label="Hôtesses" value={byRole.field_agent.length} />
                            <StatCard label="Superviseurs" value={byRole.supervisor.length} />
                            <StatCard
                                label="En poste"
                                value={staff.filter((s) => s.on_site_now).length}
                                highlight
                            />
                        </div>

                        <Panel>
                            <ul className="divide-y divide-slate-100">
                                {staff.map((member) => (
                                    <li key={member.id}>
                                        <Link
                                            href={personnelShow({ personnel: member.id }).url}
                                            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-aktivy"
                                        >
                                            {/* Avatar initiales */}
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-aktivy-deep font-semibold text-sm">
                                                {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                                            </div>

                                            {/* Identité */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-sm font-semibold text-ink group-hover:text-aktivy-deep">
                                                        {member.name}
                                                    </span>
                                                    <StatusBadge tone={roleTone[member.role] ?? 'neutral'}>
                                                        {roleShort[member.role] ?? member.role_label}
                                                    </StatusBadge>
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                                    {member.phone && (
                                                        <span>{member.phone}</span>
                                                    )}
                                                    {member.on_site_now && (
                                                        <span className="flex items-center gap-1 font-medium text-aktivy-deep">
                                                            <MapPin className="size-3" />
                                                            {member.on_site_now}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats + statut */}
                                            <div className="hidden shrink-0 items-center gap-4 sm:flex">
                                                {member.visits_count > 0 && (
                                                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <BadgeCheck className="size-3.5 text-aktivy" />
                                                        {member.visits_count} visite{member.visits_count > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                <StatusBadge tone={statusTone[member.status] ?? 'neutral'}>
                                                    {member.status_label}
                                                </StatusBadge>
                                            </div>

                                            <div className="shrink-0 sm:hidden">
                                                <StatusBadge tone={statusTone[member.status] ?? 'neutral'}>
                                                    {member.status_label}
                                                </StatusBadge>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    </div>
                )}
            </Page>
        </>
    );
}

function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${highlight ? 'border-aktivy/30 bg-aktivy-soft' : 'border-slate-200 bg-white'}`}>
            <p className="text-2xl font-bold text-ink">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
        </div>
    );
}

PersonnelIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};
