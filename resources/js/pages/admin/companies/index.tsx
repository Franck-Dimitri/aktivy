import { Head, Link, router } from '@inertiajs/react';
import { Blocks, Building2, CheckCircle2, Clock, FileText, Inbox, PauseCircle, PlayCircle, Plus, Search, Store, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreateCompanyModal } from '@/components/admin/create-company-modal';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { index as companiesIndex, plan as companyPlan, reactivate, show as companyShow, suspend } from '@/routes/admin/companies';
import { index as onboardingIndex, show as onboardingShow } from '@/routes/admin/onboarding';
import { CompanyAvatar, MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';

type Company = {
    id: number;
    uuid: string;
    name: string;
    city: string | null;
    email: string | null;
    status: 'active' | 'pending' | 'rejected' | 'suspended';
    users_count: number;
    sites_count: number;
    last_report: string | null;
    created_at: string | null;
    plan: string;
    plan_key: string;
    plan_trial: boolean;
};

type Filter = 'all' | Company['status'];

const STATUS: Record<Company['status'], { tone: StatusTone; label: string }> = {
    active: { tone: 'success', label: 'Active' },
    pending: { tone: 'warning', label: 'En attente' },
    rejected: { tone: 'neutral', label: 'Rejetée' },
    suspended: { tone: 'danger', label: 'Suspendue' },
};

/** « 25/10/2026 » → nombre de jours écoulés (null si illisible). */
function daysSince(date: string | null): number | null {
    const m = date && /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
    if (!m) return null;
    const then = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - then.getTime()) / 86_400_000));
}

function LastReport({ date }: { date: string | null }) {
    const days = daysSince(date);
    if (days === null) return <span className="text-slate-400">Aucun rapport</span>;

    const label = days === 0 ? 'Aujourd’hui' : days === 1 ? 'Hier' : `Il y a ${days} j`;
    const dot = days <= 2 ? 'bg-green-500' : days <= 14 ? 'bg-amber-400' : 'bg-slate-300';

    return (
        <span className="inline-flex items-center gap-1.5 text-slate-600" title={`Dernier rapport le ${date}`}>
            <span className={cn('size-1.5 rounded-full', dot)} />
            {label}
        </span>
    );
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export default function AdminCompanies({ companies, sectors }: { companies: Company[]; sectors: string[] }) {
    // Création dans un modal ; l'ancienne adresse /admin/entreprises/creer arrive ici avec ?creer=1
    const [creating, setCreating] = useState(false);
    // Ouverture après l'hydratation (le rendu serveur ne connaît pas l'adresse du navigateur)
    useEffect(() => {
        if (new URLSearchParams(window.location.search).has('creer')) {
            setCreating(true);
        }
    }, []);
    const closeCreate = () => {
        setCreating(false);
        const url = new URL(window.location.href);
        if (url.searchParams.has('creer')) {
            url.searchParams.delete('creer');
            window.history.replaceState(window.history.state, '', url.toString());
        }
    };
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [target, setTarget] = useState<Company | null>(null);
    const [open, setOpen] = useState(false);
    const ask = (c: Company) => {
        setTarget(c);
        setOpen(true);
    };
    const [processing, setProcessing] = useState(false);

    const count = (s: Company['status']) => companies.filter((c) => c.status === s).length;
    const counts = { active: count('active'), pending: count('pending'), suspended: count('suspended'), rejected: count('rejected') };

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return companies.filter(
            (c) => (filter === 'all' || c.status === filter) && (!q || `${c.name} ${c.city ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q)),
        );
    }, [companies, query, filter]);

    const suspending = target?.status === 'active';

    const confirmToggle = () => {
        if (!target) return;
        router.post(
            (suspending ? suspend(target.uuid) : reactivate(target.uuid)).url,
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onSuccess: () => {
                    toast.success(suspending ? 'Entreprise suspendue' : 'Entreprise réactivée');
                    setOpen(false);
                },
                onError: () => toast.error('L’opération a échoué, réessayez.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title="Entreprises" />

            <Page
                title="Entreprises"
                description={`${plural(companies.length, 'entreprise')} sur la plateforme.`}

                actions={
                    <>
                        <Link href={onboardingIndex().url} className={buttonClass('secondary', 'md')}>
                            <Inbox />
                            Demandes d’inscription
                            {counts.pending > 0 && (
                                <span className="rounded-md bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700 tabular-nums">
                                    {counts.pending}
                                </span>
                            )}
                        </Link>
                        <button type="button" onClick={() => setCreating(true)} className={buttonClass('primary', 'md')}>
                            <Plus />
                            Créer une entreprise
                        </button>
                    </>
                }
            >
                <MetricRow
                    items={[
                        { label: 'Entreprises', value: companies.length, hint: 'Tous statuts confondus', icon: Building2 },
                        { label: 'Actives', value: counts.active, hint: 'Accès ouvert', icon: CheckCircle2, tone: 'green' },
                        {
                            label: 'En attente',
                            value: counts.pending,
                            hint: 'Inscription à valider',
                            icon: Clock,
                            tone: counts.pending ? 'amber' : 'default',
                            pulse: true,
                        },
                        {
                            label: 'Suspendues',
                            value: counts.suspended,
                            hint: 'Accès bloqué',
                            icon: PauseCircle,
                            tone: counts.suspended ? 'red' : 'default',
                        },
                    ]}
                />

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-sidebar-border">
                        <Segmented
                            label="Filtrer par statut"
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { value: 'all', label: 'Toutes', count: companies.length },
                                { value: 'active', label: 'Actives', count: counts.active },
                                { value: 'pending', label: 'En attente', count: counts.pending },
                                { value: 'suspended', label: 'Suspendues', count: counts.suspended },
                                ...(counts.rejected ? [{ value: 'rejected' as const, label: 'Rejetées', count: counts.rejected }] : []),
                            ]}
                        />
                        <div className="lg:w-80">
                            <TextInput
                                icon={Search}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Nom, ville ou e-mail"
                                aria-label="Rechercher une entreprise"
                                className="h-9"
                            />
                        </div>
                    </div>

                    {shown.length === 0 ? (
                        <QuietEmpty icon={Search} title="Aucune entreprise ne correspond">
                            Modifiez la recherche ou le filtre.
                        </QuietEmpty>
                    ) : (
                        <div role="table" aria-label="Entreprises">
                            <div
                                role="row"
                                className="hidden grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))_auto] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase lg:grid dark:border-sidebar-border dark:bg-white/[0.02]"
                            >
                                <span role="columnheader">Entreprise</span>
                                <span role="columnheader">Équipe</span>
                                <span role="columnheader">Activité</span>
                                <span role="columnheader">Statut</span>
                                <span role="columnheader" className="w-[272px] text-right">
                                    Actions
                                </span>
                            </div>

                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                {shown.map((c) => (
                                    <li
                                        key={c.id}
                                        role="row"
                                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-slate-50/60 sm:px-5 lg:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))_auto] dark:hover:bg-white/[0.02]"
                                    >
                                        <div role="cell" className="flex min-w-0 items-center gap-3.5">
                                            <CompanyAvatar name={c.name} muted={c.status !== 'active'} />
                                            <div className="min-w-0">
                                                <Link
                                                    href={companyShow(c.uuid).url}
                                                    className="block truncate text-sm font-semibold text-ink hover:text-motriks-deep hover:underline"
                                                >
                                                    {c.name}
                                                </Link>
                                                <p className="truncate text-xs text-slate-500">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                        {c.plan}
                                                        {c.plan_trial ? ' (essai)' : ''}
                                                    </span>
                                                    {' · '}
                                                    {[c.email, c.city].filter(Boolean).join(' · ') || '—'}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-400 lg:hidden">
                                                    {plural(c.users_count, 'utilisateur')} · {plural(c.sites_count, 'site')}
                                                </p>
                                            </div>
                                        </div>

                                        <div role="cell" className="hidden flex-col gap-1 text-xs text-slate-600 lg:flex">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Users className="size-3.5 text-slate-400" />
                                                {plural(c.users_count, 'utilisateur')}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Store className="size-3.5 text-slate-400" />
                                                {plural(c.sites_count, 'site')}
                                            </span>
                                        </div>

                                        <div role="cell" className="hidden flex-col gap-1 text-xs lg:flex">
                                            <LastReport date={c.last_report} />
                                            {c.created_at && <span className="text-[11px] text-slate-400">Inscrite le {c.created_at}</span>}
                                        </div>

                                        <div role="cell" className="justify-self-end lg:justify-self-start">
                                            <StatusBadge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</StatusBadge>
                                        </div>

                                        <div
                                            role="cell"
                                            className="col-span-2 flex items-center justify-between gap-2 lg:col-span-1 lg:w-[272px] lg:justify-end"
                                        >
                                            <span className="text-xs lg:hidden">
                                                <LastReport date={c.last_report} />
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Link href={onboardingShow(c.uuid).url} className={buttonClass('ghost', 'sm')}>
                                                    <FileText />
                                                    Dossier
                                                </Link>
                                                <Link href={companyPlan(c.uuid).url} className={buttonClass('ghost', 'sm')}>
                                                    <Blocks />
                                                    Forfait
                                                </Link>
                                                {c.status === 'active' && (
                                                    <ActionButton variant="icon-danger" size="sm" icon={<PauseCircle />} onClick={() => ask(c)}>
                                                        Suspendre
                                                    </ActionButton>
                                                )}
                                                {c.status === 'suspended' && (
                                                    <ActionButton size="sm" icon={<PlayCircle />} onClick={() => ask(c)}>
                                                        Réactiver
                                                    </ActionButton>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            </Page>

            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                tone={suspending ? 'danger' : 'primary'}
                icon={suspending ? PauseCircle : PlayCircle}
                title={suspending ? `Suspendre « ${target?.name} » ?` : `Réactiver « ${target?.name} » ?`}
                description={
                    suspending
                        ? 'Tous ses utilisateurs seront déconnectés et ne pourront plus se connecter. Ses données sont conservées et l’accès peut être rétabli à tout moment.'
                        : 'Ses utilisateurs pourront de nouveau se connecter et retrouveront toutes leurs données.'
                }
                confirmLabel={suspending ? 'Suspendre' : 'Réactiver'}
                loading={processing}
                onConfirm={confirmToggle}
            />

            {creating && <CreateCompanyModal sectors={sectors} onClose={closeCreate} />}
        </>
    );
}

AdminCompanies.layout = {
    breadcrumbs: [{ title: 'Entreprises', href: companiesIndex().url }],
};
