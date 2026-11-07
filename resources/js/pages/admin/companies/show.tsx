import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    BellRing,
    Blocks,
    ClipboardList,
    Eye,
    FileText,
    KeyRound,
    Mail,
    MailCheck,
    MapPin,
    PauseCircle,
    Pencil,
    Phone,
    PlayCircle,
    Send,
    Users,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import {
    PaymentsPanel,
    type PaymentRow,
} from '@/components/admin/payments-panel';
import {
    RecordPaymentModal,
    type Option,
} from '@/components/admin/record-payment-modal';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { MetricRow } from '@/components/page/list-kit';
import { Modal } from '@/components/page/modal';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { auditLabel } from '@/lib/audit-actions';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes/admin';
import {
    index as companiesIndex,
    modules as companyModules,
    reactivate,
    suspend,
    update as companyUpdate,
} from '@/routes/admin/companies';
import {
    impersonate as managerImpersonate,
    invitation as managerInvitation,
    password as managerPassword,
    verification as managerVerification,
} from '@/routes/admin/companies/managers';
import { show as onboardingShow } from '@/routes/admin/onboarding';
import { remind as subscriptionRemind } from '@/routes/admin/subscriptions';

type Company = {
    id: number;
    name: string;
    status: 'active' | 'pending' | 'rejected' | 'suspended';
    sector: string | null;
    city: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    currency: string;
    created_at: string | null;
    has_file: boolean;
    rejection_reason: string | null;
};

type Manager = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    verified: boolean;
    invited: boolean;
    status: string;
    last_login: string | null;
};

type Props = {
    company: Company;
    managers: Manager[];
    team: { supervisors: number; hostesses: number; accountants: number };
    sites: { id: number; name: string; city: string | null; status: string }[];
    usage: {
        reports: number;
        active_hostesses: number;
        revenue: number;
        last_report: string | null;
    };
    modules: { label: string; ends_on: string | null; is_trial: boolean }[];
    history: {
        id: number;
        action: string;
        user: string | null;
        at: string | null;
    }[];
    sectors: string[];
    payments: PaymentRow[];
    billing: {
        modules: Option[];
        methods: Option[];
        active_keys: string[];
        has_deadline: boolean;
    };
};

const STATUS: Record<Company['status'], { label: string; tone: StatusTone }> = {
    active: { label: 'Active', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    rejected: { label: 'Rejetée', tone: 'danger' },
    suspended: { label: 'Suspendue', tone: 'neutral' },
};

const number = new Intl.NumberFormat('fr-FR');

function EditCompanyModal({
    company,
    sectors,
    onClose,
}: {
    company: Company;
    sectors: string[];
    onClose: () => void;
}) {
    const { data, setData, put, processing, errors } = useForm({
        name: company.name,
        sector: company.sector ?? '',
        city: company.city ?? '',
        address: company.address ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(companyUpdate(company.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
            onError: toastFormError,
        });
    };

    return (
        <Modal
            onClose={onClose}
            title="Modifier l’entreprise"
            description="Ces informations apparaissent sur les documents de l’entreprise."
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <Field
                        label="Nom"
                        htmlFor="c-name"
                        required
                        error={errors.name}
                    >
                        <TextInput
                            id="c-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            error={errors.name}
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Secteur"
                            htmlFor="c-sector"
                            error={errors.sector}
                        >
                            <SelectInput
                                id="c-sector"
                                value={data.sector}
                                onChange={(e) =>
                                    setData('sector', e.target.value)
                                }
                                error={errors.sector}
                            >
                                <option value="">—</option>
                                {[
                                    ...new Set([
                                        ...sectors,
                                        ...(data.sector ? [data.sector] : []),
                                    ]),
                                ].map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field
                            label="Ville"
                            htmlFor="c-city"
                            error={errors.city}
                        >
                            <TextInput
                                id="c-city"
                                value={data.city}
                                onChange={(e) =>
                                    setData('city', e.target.value)
                                }
                                error={errors.city}
                            />
                        </Field>
                    </div>
                    <Field
                        label="Adresse"
                        htmlFor="c-address"
                        error={errors.address}
                    >
                        <TextInput
                            id="c-address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            error={errors.address}
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Téléphone"
                            htmlFor="c-phone"
                            error={errors.phone}
                        >
                            <TextInput
                                id="c-phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                error={errors.phone}
                            />
                        </Field>
                        <Field
                            label="E-mail de contact"
                            htmlFor="c-email"
                            error={errors.email}
                        >
                            <TextInput
                                id="c-email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                error={errors.email}
                            />
                        </Field>
                    </div>
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

function ManagerCard({
    companyId,
    companyActive,
    manager,
}: {
    companyId: number;
    companyActive: boolean;
    manager: Manager;
}) {
    const post = (url: string) =>
        router.post(url, {}, { preserveScroll: true, onError: toastFormError });

    return (
        <li className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                        {manager.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {manager.email && (
                            <span className="inline-flex items-center gap-1">
                                <Mail className="size-3" />
                                {manager.email}
                            </span>
                        )}
                        {manager.phone && (
                            <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" />
                                {manager.phone}
                            </span>
                        )}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        {manager.last_login
                            ? `Dernière connexion le ${manager.last_login}`
                            : 'Jamais connecté'}
                    </p>
                </div>
                {manager.invited ? (
                    <StatusBadge tone="warning">
                        Invitation non ouverte
                    </StatusBadge>
                ) : manager.verified ? (
                    <StatusBadge tone="success">E-mail confirmé</StatusBadge>
                ) : (
                    <StatusBadge tone="warning">
                        E-mail non confirmé
                    </StatusBadge>
                )}
            </div>

            {manager.email && (
                <div className="flex flex-wrap gap-2">
                    {manager.invited ? (
                        <ActionButton
                            size="sm"
                            variant="secondary"
                            icon={<Send />}
                            onClick={() =>
                                post(
                                    managerInvitation({
                                        company: companyId,
                                        user: manager.id,
                                    }).url,
                                )
                            }
                        >
                            Renvoyer l’invitation
                        </ActionButton>
                    ) : (
                        <>
                            {!manager.verified && (
                                <ActionButton
                                    size="sm"
                                    variant="secondary"
                                    icon={<MailCheck />}
                                    onClick={() =>
                                        post(
                                            managerVerification({
                                                company: companyId,
                                                user: manager.id,
                                            }).url,
                                        )
                                    }
                                >
                                    Renvoyer l’e-mail de confirmation
                                </ActionButton>
                            )}
                            <ActionButton
                                size="sm"
                                variant="secondary"
                                icon={<KeyRound />}
                                onClick={() =>
                                    post(
                                        managerPassword({
                                            company: companyId,
                                            user: manager.id,
                                        }).url,
                                    )
                                }
                            >
                                Envoyer un lien de nouveau mot de passe
                            </ActionButton>
                            {companyActive && manager.status === 'active' && (
                                <ActionButton
                                    size="sm"
                                    variant="secondary"
                                    icon={<Eye />}
                                    className="border-violet-200 text-violet-700 hover:bg-violet-50"
                                    onClick={() => {
                                        if (
                                            !confirm(
                                                `Ouvrir l’espace de ${manager.name} ? Vous verrez exactement ce qu’il voit ; vos actions seront notées dans le journal.`,
                                            )
                                        )
                                            return;
                                        router.post(
                                            managerImpersonate({
                                                company: companyId,
                                                user: manager.id,
                                            }).url,
                                            {},
                                            { onError: toastFormError },
                                        );
                                    }}
                                >
                                    Se connecter en tant que
                                </ActionButton>
                            )}
                        </>
                    )}
                </div>
            )}
        </li>
    );
}

export default function AdminCompanyShow({
    company,
    managers,
    team,
    sites,
    usage,
    modules,
    history,
    sectors,
    payments,
    billing,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [paying, setPaying] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const status = STATUS[company.status];
    const suspending = company.status === 'active';

    const [toggling, setToggling] = useState(false);

    const toggle = () =>
        router.post(
            (suspending ? suspend(company.id) : reactivate(company.id)).url,
            {},
            {
                preserveScroll: true,
                onStart: () => setToggling(true),
                onFinish: () => {
                    setToggling(false);
                    setConfirming(false);
                },
            },
        );

    return (
        <>
            <Head title={company.name} />

            <Page
                title={company.name}
                description={[
                    company.sector,
                    company.city,
                    company.created_at
                        ? `Inscrite le ${company.created_at}`
                        : null,
                ]
                    .filter(Boolean)
                    .join(' · ')}
                className="max-w-6xl"
                actions={
                    <>
                        <ActionButton
                            variant="secondary"
                            icon={<Pencil />}
                            onClick={() => setEditing(true)}
                        >
                            Modifier
                        </ActionButton>
                        <Link
                            href={companyModules(company.id).url}
                            className={buttonClass('secondary', 'md')}
                        >
                            <Blocks />
                            Modules
                        </Link>
                        {company.has_file && (
                            <Link
                                href={onboardingShow(company.id).url}
                                className={buttonClass('secondary', 'md')}
                            >
                                <FileText />
                                Dossier
                            </Link>
                        )}
                        {(company.status === 'active' ||
                            company.status === 'suspended') && (
                            <ActionButton
                                variant={suspending ? 'secondary' : 'primary'}
                                icon={
                                    suspending ? (
                                        <PauseCircle />
                                    ) : (
                                        <PlayCircle />
                                    )
                                }
                                className={
                                    suspending
                                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                                        : undefined
                                }
                                onClick={() => setConfirming(true)}
                            >
                                {suspending ? 'Suspendre' : 'Réactiver'}
                            </ActionButton>
                        )}
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={status.tone}>
                            {status.label}
                        </StatusBadge>
                        {company.status === 'rejected' &&
                            company.rejection_reason && (
                                <span className="text-sm text-slate-500">
                                    Motif : {company.rejection_reason}
                                </span>
                            )}
                    </div>

                    <MetricRow
                        items={[
                            {
                                label: 'Rapports (30 jours)',
                                value: usage.reports,
                                hint: usage.last_report
                                    ? `Dernier le ${new Date(usage.last_report).toLocaleDateString('fr-FR')}`
                                    : 'Aucun rapport',
                                icon: ClipboardList,
                                tone: usage.reports ? 'green' : 'amber',
                            },
                            {
                                label: 'Hôtesses actives (30 jours)',
                                value: usage.active_hostesses,
                                hint: `sur ${team.hostesses} inscrite${team.hostesses > 1 ? 's' : ''}`,
                                icon: Users,
                                tone: 'blue',
                            },
                            {
                                label: 'Points de vente',
                                value: sites.length,
                                hint: `${team.supervisors} superviseur${team.supervisors > 1 ? 's' : ''} · ${team.accountants} comptable${team.accountants > 1 ? 's' : ''}`,
                                icon: MapPin,
                            },
                            {
                                label: `CA déclaré (30 jours, ${company.currency})`,
                                value: number.format(Math.round(usage.revenue)),
                                icon: Wallet,
                            },
                        ]}
                    />

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <div className="flex flex-col gap-6">
                            <Panel
                                title={
                                    managers.length > 1 ? 'Gérants' : 'Gérant'
                                }
                                description="Vous ne voyez jamais le mot de passe : le gérant le choisit depuis le lien reçu par e-mail."
                            >
                                {managers.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-slate-400">
                                        Aucun gérant.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                        {managers.map((m) => (
                                            <ManagerCard
                                                key={m.id}
                                                companyId={company.id}
                                                companyActive={
                                                    company.status === 'active'
                                                }
                                                manager={m}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </Panel>

                            <PaymentsPanel
                                payments={payments}
                                actions={
                                    <div className="flex flex-wrap gap-2">
                                        {billing.has_deadline && (
                                            <ActionButton
                                                size="sm"
                                                variant="ghost"
                                                icon={<BellRing />}
                                                onClick={() =>
                                                    router.post(
                                                        subscriptionRemind(
                                                            company.id,
                                                        ).url,
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                            onError:
                                                                toastFormError,
                                                        },
                                                    )
                                                }
                                            >
                                                Relancer
                                            </ActionButton>
                                        )}
                                        <ActionButton
                                            size="sm"
                                            variant="secondary"
                                            icon={<Banknote />}
                                            onClick={() => setPaying(true)}
                                        >
                                            Paiement reçu
                                        </ActionButton>
                                    </div>
                                }
                            />

                            <Panel
                                title="Historique"
                                description="Les 25 derniers événements de l’entreprise."
                            >
                                {history.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-slate-400">
                                        Aucun événement enregistré.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                        {history.map((h) => (
                                            <li
                                                key={h.id}
                                                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-2.5 text-sm"
                                            >
                                                <span className="text-ink">
                                                    {auditLabel(h.action)}
                                                    {h.user && (
                                                        <span className="text-slate-400">
                                                            {' '}
                                                            · {h.user}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-400 tabular-nums">
                                                    {h.at}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>

                        <div className="flex flex-col gap-6">
                            <Panel title="Coordonnées">
                                <dl className="divide-y divide-slate-100 text-sm dark:divide-sidebar-border">
                                    {[
                                        ['E-mail', company.email],
                                        ['Téléphone', company.phone],
                                        [
                                            'Adresse',
                                            [company.address, company.city]
                                                .filter(Boolean)
                                                .join(', '),
                                        ],
                                        ['Secteur', company.sector],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="flex justify-between gap-4 px-5 py-2.5"
                                        >
                                            <dt className="text-slate-500">
                                                {label}
                                            </dt>
                                            <dd className="text-right text-ink">
                                                {value || '—'}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </Panel>

                            <Panel
                                title="Modules actifs"
                                actions={
                                    <Link
                                        href={companyModules(company.id).url}
                                        className={buttonClass('ghost', 'sm')}
                                    >
                                        Gérer
                                    </Link>
                                }
                            >
                                {modules.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-slate-400">
                                        Aucun module actif.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                        {modules.map((m) => (
                                            <li
                                                key={m.label}
                                                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                                            >
                                                <span className="text-ink">
                                                    {m.label}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {m.is_trial
                                                        ? 'Essai · '
                                                        : ''}
                                                    {m.ends_on
                                                        ? `jusqu’au ${m.ends_on}`
                                                        : 'sans fin'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>

                            <Panel title={`Points de vente (${sites.length})`}>
                                {sites.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-slate-400">
                                        Aucun point de vente créé.
                                    </p>
                                ) : (
                                    <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-sidebar-border">
                                        {sites.map((s) => (
                                            <li
                                                key={s.id}
                                                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                                            >
                                                <span className="truncate text-ink">
                                                    {s.name}
                                                </span>
                                                <span className="shrink-0 text-xs text-slate-500">
                                                    {s.city ?? '—'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>
                    </div>
                </div>
            </Page>

            {paying && (
                <RecordPaymentModal
                    company={{ id: company.id, name: company.name }}
                    modules={billing.modules}
                    methods={billing.methods}
                    activeKeys={billing.active_keys}
                    onClose={() => setPaying(false)}
                />
            )}

            {editing && (
                <EditCompanyModal
                    company={company}
                    sectors={sectors}
                    onClose={() => setEditing(false)}
                />
            )}

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={
                    suspending
                        ? `Suspendre « ${company.name} » ?`
                        : `Réactiver « ${company.name} » ?`
                }
                description={
                    suspending
                        ? 'Ses utilisateurs ne pourront plus se connecter. Les données sont conservées.'
                        : 'Ses utilisateurs pourront de nouveau se connecter.'
                }
                confirmLabel={suspending ? 'Suspendre' : 'Réactiver'}
                tone={suspending ? 'danger' : 'primary'}
                icon={suspending ? PauseCircle : PlayCircle}
                loading={toggling}
                onConfirm={toggle}
            />
        </>
    );
}

AdminCompanyShow.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Entreprises', href: companiesIndex().url },
    ],
};
