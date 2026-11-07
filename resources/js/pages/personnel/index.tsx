import { Head, Link } from '@inertiajs/react';
import { ArrowUpDown, Eye, MapPin, MoreHorizontal, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { MetricStrip } from '@/components/page/surface';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as personnelIndex, create as personnelCreate, show as personnelShow, destroy as personnelDestroy } from '@/routes/personnel';
import type { RoleOption, StaffListItem } from '@/types';
import { CreateMemberModal } from './create-member-modal';
import { initials } from '@/lib/initials';

type Props = {
    staff: StaffListItem[];
    /** Optionnel : fourni par le contrôleur. Sans lui, « Ajouter un membre » ouvre l'ancienne page. */
    roles?: RoleOption[];
};

type RoleFilter = 'all' | 'field_agent' | 'supervisor' | 'accountant';
type StatusFilter = 'all' | 'active' | 'suspended';
type SortKey = 'name' | 'visits';

const roleShort: Record<string, string> = {
    supervisor: 'Superviseur',
    field_agent: 'Hôtesse',
    accountant: 'Comptable',
};

const avatarTone: Record<string, string> = {
    field_agent: 'bg-green-50 text-motriks-deep ring-green-600/15',
    supervisor: 'bg-blue-50 text-blue-700 ring-blue-600/15',
    accountant: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};

const roleText: Record<string, string> = {
    field_agent: 'text-motriks-deep',
    supervisor: 'text-blue-700',
    accountant: 'text-slate-600',
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


const chipBase =
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none';

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`${chipBase} ${
                active
                    ? 'border-green-600/30 bg-green-50 text-motriks-deep'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            {children}
            {count !== undefined && <span className={`tabular-nums ${active ? 'text-motriks-deep/70' : 'text-slate-400'}`}>{count}</span>}
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
                                        className="h-10 rounded-xl border border-slate-200 bg-white pr-8 pl-9 text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
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
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
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
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    }
                                />
                            </Panel>
                        ) : (
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {visible.map((member) => (
                                    <MemberCard key={member.id} member={member} onDelete={() => ask(member)} />
                                ))}
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

/** +237673390280 → +237 673 39 02 80 (lecture plus facile) ; les autres formats restent tels quels. */
function prettyPhone(phone: string) {
    const m = /^\+237(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(phone.replace(/\s/g, ''));
    return m ? `+237 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Carte compacte : toute la carte ouvre la fiche ; Modifier / Supprimer sont dans le menu « ⋯ ». */
function MemberCard({ member, onDelete }: { member: StaffListItem; onDelete: () => void }) {
    const showUrl = personnelShow({ personnel: member.id }).url;
    const suspended = member.status === 'suspended';
    const onSite = !!member.on_site_now;

    return (
        <li className="group relative">
            <Link
                href={showUrl}
                className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
            >
                <div className="flex items-center gap-3 p-4 pr-12">
                    <span className={cn('relative flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ring-1 ring-inset', avatarTone[member.role] ?? avatarTone.accountant, suspended && 'opacity-50 grayscale')}>
                        {initials(member.name)}
                        {onSite && (
                            <span className="absolute -right-0.5 -bottom-0.5 flex size-3" aria-hidden>
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                                <span className="relative inline-flex size-3 rounded-full bg-green-500 ring-2 ring-white" />
                            </span>
                        )}
                    </span>

                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-motriks-deep">{member.name}</h3>
                            {suspended && <StatusBadge tone="warning">{member.status_label}</StatusBadge>}
                        </div>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500">
                            <span className={cn('shrink-0 font-medium', roleText[member.role] ?? 'text-slate-600')}>{roleShort[member.role] ?? member.role_label}</span>
                            {member.phone && (
                                <>
                                    <span aria-hidden className="text-slate-300">·</span>
                                    <span className="truncate tabular-nums">{prettyPhone(member.phone)}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs">
                    <span className={cn('flex min-w-0 items-center gap-1.5', onSite ? 'font-medium text-motriks-deep' : 'text-slate-400')}>
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{onSite ? member.on_site_now : 'Hors poste'}</span>
                    </span>
                    <span className="shrink-0 text-slate-500 tabular-nums">
                        <span className="font-semibold text-ink">{member.visits_count}</span> visite{member.visits_count > 1 ? 's' : ''}
                    </span>
                </div>
            </Link>

            {/* Actions : hors du lien (pas de bouton dans un lien) */}
            <div className="absolute top-3 right-3">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Actions pour ${member.name}`}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none data-[state=open]:bg-slate-100 data-[state=open]:text-ink"
                        >
                            <MoreHorizontal className="size-[18px]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                            <Link href={showUrl}>
                                <Eye className="size-4" />
                                Voir la fiche
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                            <Link href={`${showUrl}?modifier=1`}>
                                <Pencil className="size-4" />
                                Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onDelete} className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600 [&_svg]:text-red-500">
                            <Trash2 className="size-4" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </li>
    );
}

PersonnelIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};