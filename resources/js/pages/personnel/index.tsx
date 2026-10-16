import { Head, Link } from '@inertiajs/react';
import { ArrowUpDown, CalendarCheck, Eye, MapPin, Pencil, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { dashboard } from '@/routes';
import { index as personnelIndex, create as personnelCreate, show as personnelShow, destroy as personnelDestroy } from '@/routes/personnel';
import type { RoleOption, StaffListItem } from '@/types';
import { CreateMemberModal } from './create-member-modal';

type Props = {
    staff: StaffListItem[];
    /** Optionnel : fourni par le contrôleur. Sans lui, « Ajouter un membre » ouvre l'ancienne page. */
    roles?: RoleOption[];
};

type RoleFilter = 'all' | 'field_agent' | 'supervisor' | 'accountant';
type StatusFilter = 'all' | 'active' | 'suspended';
type SortKey = 'name' | 'visits';

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

const avatarTone: Record<string, string> = {
    field_agent:
        'from-green-50 to-green-100 text-aktivy-deep ring-green-600/10 group-hover:from-green-500 group-hover:to-green-600 group-hover:shadow-green-600/30',
    supervisor:
        'from-blue-50 to-blue-100 text-blue-700 ring-blue-600/10 group-hover:from-blue-500 group-hover:to-blue-600 group-hover:shadow-blue-600/30',
    accountant:
        'from-slate-100 to-slate-200 text-slate-700 ring-slate-500/10 group-hover:from-slate-600 group-hover:to-slate-700 group-hover:shadow-slate-600/30',
};

const roleFilters: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'field_agent', label: 'Hôtesses' },
    { value: 'supervisor', label: 'Superviseurs' },
    { value: 'accountant', label: 'Comptables' },
];

const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Tous statuts' },
    { value: 'active', label: 'Actifs' },
    { value: 'suspended', label: 'Suspendus' },
];

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

const iconBtn =
    'flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none';

const chipBase =
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none';

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`${chipBase} ${
                active
                    ? 'border-green-600/30 bg-green-50 text-aktivy-deep'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            {children}
            {count !== undefined && <span className={`tabular-nums ${active ? 'text-aktivy-deep/70' : 'text-slate-400'}`}>{count}</span>}
        </button>
    );
}

export default function PersonnelIndex({ staff, roles }: Props) {
    // Fenêtre de création : montée uniquement quand elle est visible (le formulaire repart de zéro à chaque ouverture).
    const [creating, setCreating] = useState(false);
    const closeCreate = useCallback(() => setCreating(false), []);

    // Bouton « ajouter un membre » : ouvre la fenêtre si les rôles sont fournis, sinon l'ancienne page.
    const newButton = (label: string) =>
        roles ? (
            <ActionButton type="button" onClick={() => setCreating(true)}>
                <span className="inline-flex items-center gap-2">
                    <Plus className="size-4" />
                    {label}
                </span>
            </ActionButton>
        ) : (
            <ActionLink href={personnelCreate().url} icon={<Plus />}>
                {label}
            </ActionLink>
        );

    const [query, setQuery] = useState('');
    const [role, setRole] = useState<RoleFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [onSiteOnly, setOnSiteOnly] = useState(false);
    const [sort, setSort] = useState<SortKey>('name');

    const { ask, dialog } = useDeleteDialog<StaffListItem>({
        getUrl: (m) => personnelDestroy({ personnel: m.id }).url,
        getTitle: (m) => `Supprimer « ${m.name} » ?`,
        getDescription: () => 'Ce membre ne pourra plus se connecter. Ses visites et affectations passées restent consultables.',
        getSuccessMessage: (m) => `${m.name} a été supprimé.`,
        confirmLabel: 'Supprimer',
        icon: Trash2,
    });

    const hostesses = staff.filter((s) => s.role === 'field_agent').length;
    const supervisors = staff.filter((s) => s.role === 'supervisor').length;
    const onSite = staff.filter((s) => s.on_site_now).length;

    const roleCounts: Record<RoleFilter, number> = {
        all: staff.length,
        field_agent: hostesses,
        supervisor: supervisors,
        accountant: staff.filter((s) => s.role === 'accountant').length,
    };
    const statusCounts: Record<StatusFilter, number> = {
        all: staff.length,
        active: staff.filter((s) => s.status === 'active').length,
        suspended: staff.filter((s) => s.status === 'suspended').length,
    };

    const hasFilters = query.trim() !== '' || role !== 'all' || status !== 'all' || onSiteOnly;

    const resetFilters = () => {
        setQuery('');
        setRole('all');
        setStatus('all');
        setOnSiteOnly(false);
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        const filtered = staff.filter((s) => {
            if (role !== 'all' && s.role !== role) return false;
            if (status !== 'all' && s.status !== status) return false;
            if (onSiteOnly && !s.on_site_now) return false;
            if (q && !(s.name.toLowerCase().includes(q) || (s.phone ?? '').includes(q))) return false;
            return true;
        });

        return [...filtered].sort((a, b) => (sort === 'visits' ? b.visits_count - a.visits_count : a.name.localeCompare(b.name, 'fr')));
    }, [staff, query, role, status, onSiteOnly, sort]);

    return (
        <>
            <Head title="Personnel" />
            <GlowStyles />

            <Page
                title="Personnel"
                description="Les membres de votre équipe terrain."
                actions={newButton('Ajouter un membre')}
            >
                {staff.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Users}
                            title="Aucun membre pour l'instant"
                            description="Ajoutez vos superviseurs, hôtesses et comptables."
                            action={newButton('Ajouter un membre')}
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                { label: 'Total', value: staff.length },
                                { label: 'Hôtesses', value: hostesses },
                                { label: 'Superviseurs', value: supervisors },
                                { label: 'En poste', value: onSite, live: onSite > 0 },
                            ]}
                        />

                        {/* Recherche, tri et filtres */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="w-full sm:max-w-sm sm:flex-1">
                                    <TextInput
                                        icon={Search}
                                        type="search"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Rechercher un nom ou un téléphone"
                                        aria-label="Rechercher un membre"
                                    />
                                </div>

                                <label className="relative flex items-center sm:ml-auto">
                                    <ArrowUpDown className="pointer-events-none absolute left-3 size-4 text-slate-400" />
                                    <select
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value as SortKey)}
                                        aria-label="Trier les membres"
                                        className="h-10 rounded-xl border border-slate-200 bg-white pr-8 pl-9 text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                    >
                                        <option value="name">Nom (A–Z)</option>
                                        <option value="visits">Plus de visites</option>
                                    </select>
                                </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par rôle">
                                    {roleFilters.map((f) => (
                                        <Chip key={f.value} active={role === f.value} onClick={() => setRole(f.value)} count={roleCounts[f.value]}>
                                            {f.label}
                                        </Chip>
                                    ))}
                                </div>

                                <span className="hidden h-5 w-px bg-slate-200 lg:block" aria-hidden />

                                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par statut">
                                    {statusFilters.map((f) => (
                                        <Chip key={f.value} active={status === f.value} onClick={() => setStatus(f.value)} count={statusCounts[f.value]}>
                                            {f.label}
                                        </Chip>
                                    ))}
                                </div>

                                <span className="hidden h-5 w-px bg-slate-200 lg:block" aria-hidden />

                                <Chip active={onSiteOnly} onClick={() => setOnSiteOnly((v) => !v)} count={onSite}>
                                    <MapPin className="size-3.5" />
                                    En poste
                                </Chip>

                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                    >
                                        <X className="size-3.5" />
                                        Réinitialiser
                                    </button>
                                )}
                            </div>

                            <p className="text-sm text-slate-500" aria-live="polite">
                                {visible.length} membre{visible.length > 1 ? 's' : ''}
                                {hasFilters && ` sur ${staff.length}`}
                            </p>
                        </div>

                        {visible.length === 0 ? (
                            <Panel>
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description="Aucun membre ne correspond à vos filtres."
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    }
                                />
                            </Panel>
                        ) : (
                            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {visible.map((member) => {
                                    const showUrl = personnelShow({ personnel: member.id }).url;

                                    return (
                                        <li key={member.id} className="h-full [&>*]:h-full [&>*]:w-full">
                                            <GlowCard contentClassName="flex h-full w-full flex-col">
                                                {/* Zone cliquable : ouvre la fiche */}
                                                <Link
                                                    href={showUrl}
                                                    className="flex flex-1 flex-col gap-5 p-5 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none focus-visible:ring-inset"
                                                >
                                                    {/* En-tête */}
                                                    <div className="flex items-start gap-4">
                                                        <div
                                                            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold ring-1 shadow-none ring-inset transition duration-300 group-hover:text-white group-hover:shadow-lg group-hover:ring-0 ${
                                                                avatarTone[member.role] ?? avatarTone.accountant
                                                            }`}
                                                        >
                                                            {initials(member.name)}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="truncate text-base font-semibold text-ink transition-colors group-hover:text-aktivy-deep">
                                                                {member.name}
                                                            </h3>
                                                            <div className="mt-1.5">
                                                                <StatusBadge tone={roleTone[member.role] ?? 'neutral'}>
                                                                    {roleShort[member.role] ?? member.role_label}
                                                                </StatusBadge>
                                                            </div>
                                                        </div>

                                                        <StatusBadge tone={statusTone[member.status] ?? 'neutral'}>{member.status_label}</StatusBadge>
                                                    </div>

                                                    {/* Détails */}
                                                    <dl className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 text-sm">
                                                        <div className="flex items-center gap-3 text-slate-600">
                                                            <Phone className="size-4 shrink-0 text-slate-400" />
                                                            <dd className="truncate tabular-nums">{member.phone ?? 'Non renseigné'}</dd>
                                                        </div>

                                                        <div className={`flex items-center gap-3 ${member.on_site_now ? 'font-medium text-aktivy-deep' : 'text-slate-400'}`}>
                                                            <MapPin className="size-4 shrink-0" />
                                                            <dd className="flex min-w-0 items-center gap-2">
                                                                {member.on_site_now && (
                                                                    <span className="relative flex size-2 shrink-0">
                                                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                                                                        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                                                                    </span>
                                                                )}
                                                                <span className="truncate">{member.on_site_now ?? 'Hors poste'}</span>
                                                            </dd>
                                                        </div>

                                                        <div className="flex items-center gap-3 text-slate-600">
                                                            <CalendarCheck className="size-4 shrink-0 text-slate-400" />
                                                            <dd className="tabular-nums">
                                                                {member.visits_count} visite{member.visits_count > 1 ? 's' : ''}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </Link>

                                                {/* Actions rapides */}
                                                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5">
                                                    <Link
                                                        href={showUrl}
                                                        className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-green-50 hover:text-aktivy-deep focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                                    >
                                                        <Eye className="size-4" />
                                                        Voir la fiche
                                                    </Link>

                                                    <div className="flex shrink-0 items-center gap-0.5">
                                                        <Link
                                                            href={`${showUrl}?modifier=1`}
                                                            title="Modifier"
                                                            aria-label={`Modifier ${member.name}`}
                                                            className={`${iconBtn} hover:bg-green-50 hover:text-aktivy-deep`}
                                                        >
                                                            <Pencil className="size-[18px]" />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => ask(member)}
                                                            title="Supprimer"
                                                            aria-label={`Supprimer ${member.name}`}
                                                            className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                                                        >
                                                            <Trash2 className="size-[18px]" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </GlowCard>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </Page>

            {creating && roles && <CreateMemberModal roles={roles} onClose={closeCreate} />}

            {dialog}
        </>
    );
}

PersonnelIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};