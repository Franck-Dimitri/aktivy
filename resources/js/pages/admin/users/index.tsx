import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Ban,
    Building2,
    KeyRound,
    Mail,
    MailCheck,
    MoreHorizontal,
    Pencil,
    Phone,
    PlayCircle,
    RotateCcw,
    Search,
    Trash2,
    UserRound,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { MetricRow, QuietEmpty } from '@/components/page/list-kit';
import { Modal } from '@/components/page/modal';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { show as companyShow } from '@/routes/admin/companies';
import {
    destroy as userDestroy,
    index as usersIndex,
    password as userPassword,
    reactivate as userReactivate,
    restore as userRestore,
    suspend as userSuspend,
    update as userUpdate,
    verification as userVerification,
} from '@/routes/admin/users';

type User = {
    id: number;
    uuid: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    role_label: string;
    status: 'active' | 'pending' | 'rejected' | 'suspended' | 'deleted';
    verified: boolean;
    invited: boolean;
    last_login: string | null;
    created_at: string | null;
    deleted_at: string | null;
    company: { id: number; uuid: string; name: string } | null;
};

type Filters = { q: string; company: string; role: string; status: string };

type Props = {
    users: Paginated<User>;
    filters: Filters;
    companies: { id: number; name: string }[];
    roles: { value: string; label: string }[];
    staff_roles: string[];
    counts: {
        total: number;
        hostesses: number;
        suspended: number;
        deleted: number;
    };
};

const STATUS: Record<User['status'], { tone: StatusTone; label: string }> = {
    active: { tone: 'success', label: 'Actif' },
    pending: { tone: 'warning', label: 'En attente' },
    rejected: { tone: 'neutral', label: 'Rejeté' },
    suspended: { tone: 'danger', label: 'Suspendu' },
    deleted: { tone: 'neutral', label: 'Supprimé' },
};

/** Libellé court du rôle, pour la liste. */
const ROLE_SHORT: Record<string, string> = {
    company_admin: 'Gérant',
    supervisor: 'Superviseur',
    field_agent: 'Hôtesse',
    accountant: 'Comptable',
};

type Pending = {
    user: User;
    kind: 'suspend' | 'reactivate' | 'delete' | 'restore';
};

const post = (
    url: string,
    method: 'post' | 'delete' = 'post',
    onFinish?: () => void,
) =>
    router.visit(url, {
        method,
        preserveScroll: true,
        preserveState: true,
        onFinish,
    });

export default function AdminUsers({
    users,
    filters,
    companies,
    roles,
    staff_roles,
    counts,
}: Props) {
    const [form, setForm] = useState(filters);
    const active = Boolean(
        filters.q || filters.company || filters.role || filters.status,
    );

    const apply = (next: Partial<Filters> = {}) => {
        const merged = { ...form, ...next };
        setForm(merged);
        router.get(
            usersIndex().url,
            Object.fromEntries(
                Object.entries(merged).filter(([, v]) => v !== ''),
            ),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    // Recherche 350 ms après la dernière frappe
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const timer = setTimeout(
            () => form.q !== filters.q && apply({ q: form.q }),
            350,
        );
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.q]);

    const [editing, setEditing] = useState<User | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        if (!pending) return;
        const { user, kind } = pending;
        const url = {
            suspend: userSuspend(user.uuid).url,
            reactivate: userReactivate(user.uuid).url,
            delete: userDestroy(user.uuid).url,
            restore: userRestore(user.uuid).url,
        }[kind];
        setProcessing(true);
        post(url, kind === 'delete' ? 'delete' : 'post', () => {
            setProcessing(false);
            setPending(null);
        });
    };

    const dialog =
        pending &&
        {
            suspend: {
                title: `Suspendre « ${pending.user.name} » ?`,
                description:
                    'Ce compte est déconnecté et ne peut plus se connecter. Ses données et son historique sont conservés.',
                label: 'Suspendre',
                tone: 'danger' as const,
                icon: Ban,
            },
            reactivate: {
                title: `Réactiver « ${pending.user.name} » ?`,
                description:
                    'Ce compte peut de nouveau se connecter avec son mot de passe habituel.',
                label: 'Réactiver',
                tone: 'primary' as const,
                icon: PlayCircle,
            },
            delete: {
                title: `Supprimer « ${pending.user.name} » ?`,
                description:
                    'Le compte ne peut plus se connecter et quitte ses points de vente. Son historique (visites, rapports) est conservé et le compte peut être restauré.',
                label: 'Supprimer',
                tone: 'danger' as const,
                icon: Trash2,
            },
            restore: {
                title: `Restaurer « ${pending.user.name} » ?`,
                description:
                    'Le compte retrouve l’accès à son entreprise. Ses affectations aux points de vente sont à refaire.',
                label: 'Restaurer',
                tone: 'primary' as const,
                icon: RotateCcw,
            },
        }[pending.kind];

    return (
        <>
            <Head title="Utilisateurs" />

            <Page
                title="Utilisateurs"
                description="Tous les comptes des entreprises clientes : gérants, superviseurs, hôtesses et comptables."
            >
                <MetricRow
                    items={[
                        {
                            label: 'Comptes',
                            value: counts.total,
                            hint: 'Toutes entreprises',
                            icon: Users,
                        },
                        {
                            label: 'Hôtesses',
                            value: counts.hostesses,
                            hint: 'Agents terrain',
                            icon: UserRound,
                            tone: 'green',
                        },
                        {
                            label: 'Suspendus',
                            value: counts.suspended,
                            hint: 'Connexion bloquée',
                            icon: Ban,
                            tone: counts.suspended ? 'red' : 'default',
                        },
                        {
                            label: 'Supprimés',
                            value: counts.deleted,
                            hint: 'Restaurables',
                            icon: Trash2,
                        },
                    ]}
                />

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                    <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] dark:border-sidebar-border">
                        <TextInput
                            icon={Search}
                            value={form.q}
                            onChange={(e) =>
                                setForm({ ...form, q: e.target.value })
                            }
                            placeholder="Nom, e-mail ou téléphone"
                            aria-label="Rechercher un utilisateur"
                            className="h-9"
                        />
                        <SelectInput
                            aria-label="Entreprise"
                            value={form.company}
                            onChange={(e) => apply({ company: e.target.value })}
                            className="h-9"
                        >
                            <option value="">Toutes les entreprises</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput
                            aria-label="Rôle"
                            value={form.role}
                            onChange={(e) => apply({ role: e.target.value })}
                            className="h-9"
                        >
                            <option value="">Tous les rôles</option>
                            {roles.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {ROLE_SHORT[r.value] ?? r.label}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput
                            aria-label="Statut"
                            value={form.status}
                            onChange={(e) => apply({ status: e.target.value })}
                            className="h-9"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="active">Actifs</option>
                            <option value="suspended">Suspendus</option>
                            <option value="unconfirmed">
                                E-mail non confirmé
                            </option>
                            <option value="deleted">Supprimés</option>
                        </SelectInput>
                    </div>

                    {users.data.length === 0 ? (
                        <QuietEmpty
                            icon={Search}
                            title="Aucun utilisateur ne correspond"
                            action={
                                active ? (
                                    <button
                                        type="button"
                                        className={buttonClass(
                                            'secondary',
                                            'sm',
                                        )}
                                        onClick={() =>
                                            apply({
                                                q: '',
                                                company: '',
                                                role: '',
                                                status: '',
                                            })
                                        }
                                    >
                                        Effacer les filtres
                                    </button>
                                ) : undefined
                            }
                        >
                            Modifiez la recherche ou les filtres.
                        </QuietEmpty>
                    ) : (
                        <div role="table" aria-label="Utilisateurs">
                            <div
                                role="row"
                                className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase lg:grid dark:border-sidebar-border dark:bg-white/[0.02]"
                            >
                                <span role="columnheader">Utilisateur</span>
                                <span role="columnheader">Entreprise</span>
                                <span role="columnheader">Rôle</span>
                                <span role="columnheader">Statut</span>
                                <span
                                    role="columnheader"
                                    className="w-[132px] text-right"
                                >
                                    Actions
                                </span>
                            </div>

                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                {users.data.map((u) => (
                                    <UserRow
                                        key={u.id}
                                        user={u}
                                        onEdit={() => setEditing(u)}
                                        onAsk={(kind) =>
                                            setPending({ user: u, kind })
                                        }
                                    />
                                ))}
                            </ul>
                        </div>
                    )}

                    <Pagination
                        page={users}
                        className="border-t border-slate-100 dark:border-sidebar-border"
                    />
                </section>
            </Page>

            {dialog && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setPending(null)}
                    tone={dialog.tone}
                    icon={dialog.icon}
                    title={dialog.title}
                    description={dialog.description}
                    confirmLabel={dialog.label}
                    loading={processing}
                    onConfirm={confirm}
                />
            )}

            {editing && (
                <EditUserModal
                    user={editing}
                    staffRoles={staff_roles}
                    roles={roles}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

function UserRow({
    user: u,
    onEdit,
    onAsk,
}: {
    user: User;
    onEdit: () => void;
    onAsk: (kind: Pending['kind']) => void;
}) {
    const deleted = u.status === 'deleted';
    const status = STATUS[u.status];

    return (
        <li
            role="row"
            className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50/60 sm:px-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] dark:hover:bg-white/[0.02]',
                deleted && 'opacity-70',
            )}
        >
            <div role="cell" className="flex min-w-0 items-center gap-3">
                <span
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        deleted || u.status === 'suspended'
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-motriks-soft text-motriks-deep',
                    )}
                    aria-hidden
                >
                    {initials(u.name)}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                        {u.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {[u.email, u.phone].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400 lg:hidden">
                        {ROLE_SHORT[u.role] ?? u.role_label}
                        {u.company && ` · ${u.company.name}`}
                    </p>
                </div>
            </div>

            <div role="cell" className="hidden min-w-0 text-sm lg:block">
                {u.company ? (
                    <Link
                        href={companyShow(u.company.uuid).url}
                        className="inline-flex max-w-full items-center gap-1.5 text-slate-700 hover:text-motriks-deep hover:underline dark:text-slate-200"
                    >
                        <Building2 className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{u.company.name}</span>
                    </Link>
                ) : (
                    <span className="text-slate-400">—</span>
                )}
            </div>

            <div
                role="cell"
                className="hidden text-sm text-slate-700 lg:block dark:text-slate-200"
            >
                {ROLE_SHORT[u.role] ?? u.role_label}
            </div>

            <div
                role="cell"
                className="flex flex-col items-end gap-1 lg:items-start"
            >
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                <span className="text-[11px] text-slate-400">
                    {deleted
                        ? `le ${u.deleted_at}`
                        : u.invited
                          ? 'Pas encore connecté'
                          : !u.verified
                            ? 'E-mail non confirmé'
                            : u.last_login
                              ? `Vu le ${u.last_login.split(' à ')[0]}`
                              : 'Jamais connecté'}
                </span>
            </div>

            <div
                role="cell"
                className="col-span-2 flex items-center justify-end gap-1.5 lg:col-span-1 lg:w-[132px]"
            >
                {deleted ? (
                    <ActionButton
                        size="sm"
                        variant="secondary"
                        icon={<RotateCcw />}
                        onClick={() => onAsk('restore')}
                    >
                        Restaurer
                    </ActionButton>
                ) : (
                    <>
                        <ActionButton
                            size="sm"
                            variant="secondary"
                            icon={<Pencil />}
                            onClick={onEdit}
                        >
                            Modifier
                        </ActionButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        buttonClass('secondary', 'sm'),
                                        'w-8 px-0',
                                    )}
                                    aria-label={`Autres actions pour ${u.name}`}
                                >
                                    <MoreHorizontal />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-60 rounded-xl p-1.5"
                            >
                                {u.email && !u.verified && (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            post(userVerification(u.uuid).url)
                                        }
                                    >
                                        <MailCheck />
                                        Renvoyer la confirmation
                                    </DropdownMenuItem>
                                )}
                                {u.email && (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            post(userPassword(u.uuid).url)
                                        }
                                    >
                                        <KeyRound />
                                        Lien de nouveau mot de passe
                                    </DropdownMenuItem>
                                )}
                                {u.email && <DropdownMenuSeparator />}
                                {u.status === 'suspended' ? (
                                    <DropdownMenuItem
                                        onSelect={() => onAsk('reactivate')}
                                    >
                                        <PlayCircle />
                                        Réactiver le compte
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onSelect={() => onAsk('suspend')}
                                    >
                                        <Ban />
                                        Suspendre le compte
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => onAsk('delete')}
                                >
                                    <Trash2 />
                                    Supprimer le compte
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                )}
            </div>
        </li>
    );
}

function EditUserModal({
    user,
    roles,
    staffRoles,
    onClose,
}: {
    user: User;
    roles: { value: string; label: string }[];
    staffRoles: string[];
    onClose: () => void;
}) {
    const isManager = user.role === 'company_admin';
    const { data, setData, transform, put, processing, errors } = useForm({
        name: user.name,
        email: user.email ?? '',
        phone: user.phone ?? '',
        role: user.role,
    });
    // Le rôle d'un gérant ne part pas : il ne se change pas ici
    transform((d) =>
        isManager ? { name: d.name, email: d.email, phone: d.phone } : d,
    );

    const emailChanged =
        data.email.trim() !== '' &&
        data.email.trim().toLowerCase() !== (user.email ?? '').toLowerCase();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(userUpdate(user.uuid).url, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onClose,
            onError: toastFormError,
        });
    };

    return (
        <Modal
            onClose={onClose}
            title={`Modifier ${user.name}`}
            description={`${ROLE_SHORT[user.role] ?? user.role_label}${user.company ? ` · ${user.company.name}` : ''}. Le mot de passe ne change pas : seul l’utilisateur le choisit.`}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <Field
                        label="Nom complet"
                        htmlFor="u-name"
                        required
                        error={errors.name}
                    >
                        <TextInput
                            id="u-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            error={errors.name}
                        />
                    </Field>
                    <Field
                        label="E-mail"
                        htmlFor="u-email"
                        required={isManager}
                        hint={
                            isManager
                                ? undefined
                                : 'facultatif si un téléphone est renseigné'
                        }
                        error={errors.email}
                    >
                        <TextInput
                            id="u-email"
                            type="email"
                            icon={Mail}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            error={errors.email}
                        />
                    </Field>
                    <Field
                        label="Téléphone"
                        htmlFor="u-phone"
                        hint={isManager ? 'facultatif' : undefined}
                        error={errors.phone}
                    >
                        <TextInput
                            id="u-phone"
                            type="tel"
                            icon={Phone}
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            error={errors.phone}
                        />
                    </Field>
                    {!isManager && (
                        <Field
                            label="Rôle"
                            htmlFor="u-role"
                            required
                            error={errors.role}
                        >
                            <SelectInput
                                id="u-role"
                                value={data.role}
                                onChange={(e) =>
                                    setData('role', e.target.value)
                                }
                                error={errors.role}
                            >
                                {roles
                                    .filter((r) => staffRoles.includes(r.value))
                                    .map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                            </SelectInput>
                        </Field>
                    )}
                    {emailChanged && (
                        <p className="flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                            <MailCheck className="mt-0.5 size-4 shrink-0" />
                            {isManager && user.invited
                                ? 'L’invitation sera envoyée à la nouvelle adresse.'
                                : 'La nouvelle adresse devra être confirmée : un e-mail de confirmation y sera envoyé.'}
                        </p>
                    )}
                </div>
                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-sidebar-border dark:bg-white/[0.02]">
                    <ActionButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        Enregistrer
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

AdminUsers.layout = {
    breadcrumbs: [{ title: 'Utilisateurs', href: usersIndex().url }],
};
