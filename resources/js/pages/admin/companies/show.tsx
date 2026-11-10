import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Banknote,
    BellRing,
    Blocks,
    Download,
    Eye,
    FileText,
    KeyRound,
    Mail,
    MailCheck,
    MoreHorizontal,
    PauseCircle,
    Pencil,
    Phone,
    PlayCircle,
    Receipt,
    Send,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { PaymentRow } from '@/components/admin/payments-panel';
import { documentsCount, LegalDocumentsList, type LegalDocument } from '@/components/company/legal-documents';
import { CompanyProducts, type CompanyProduct } from '@/components/admin/company-products';
import { RecordPaymentModal, type Option, type PlanOption } from '@/components/admin/record-payment-modal';
import { InvoicePreviewModal, type InvoiceUrls } from '@/components/invoices/invoice-preview';
import { packSummary, PlanUsageList, type PackCatalog, type PlanState } from '@/components/plans/plan-usage';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { CompanyAvatar, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Modal } from '@/components/page/modal';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { MetricStrip } from '@/components/page/surface';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { auditLabel } from '@/lib/audit-actions';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { currencyLabel, number } from '@/pages/reports/format';
import { dashboard } from '@/routes/admin';
import { index as usersIndex } from '@/routes/admin/users';
import { index as companiesIndex, plan as companyPlan, reactivate, suspend, update as companyUpdate } from '@/routes/admin/companies';
import { store as documentStore } from '@/routes/admin/companies/documents';
import {
    impersonate as managerImpersonate,
    invitation as managerInvitation,
    password as managerPassword,
    update as managerUpdate,
    verification as managerVerification,
} from '@/routes/admin/companies/managers';
import { preview as invoicePreview } from '@/routes/admin/invoices';
import { show as onboardingShow } from '@/routes/admin/onboarding';
import { invoice as invoiceDownload, remind as subscriptionRemind } from '@/routes/admin/subscriptions';

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
    logo_url: string | null;
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

type Payment = Omit<PaymentRow, 'plan'> & { plan: string | null; period_start: string | null };

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
    plan: PlanState;
    documents: LegalDocument[];
    products: CompanyProduct[];
    history: {
        id: number;
        action: string;
        user: string | null;
        at: string | null;
    }[];
    sectors: string[];
    payments: Payment[];
    billing: {
        plans: PlanOption[];
        methods: Option[];
        packs: PackCatalog;
        can_remind: boolean;
    };
};

const STATUS: Record<Company['status'], { label: string; tone: StatusTone }> = {
    active: { label: 'Active', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    rejected: { label: 'Rejetée', tone: 'danger' },
    suspended: { label: 'Suspendue', tone: 'neutral' },
};

/** Adresses admin du PDF des factures (objet stable, hors du composant). */
const ADMIN_URLS: InvoiceUrls = { preview: (id) => invoicePreview(id).url, download: (id) => invoiceDownload(id).url };

type Tab = 'overview' | 'billing' | 'team' | 'products' | 'history';

const card = 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs';

/** Carte sobre : titre, action discrète à droite, contenu. */
function Card({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn(card, className)}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

function EditCompanyModal({ company, sectors, onClose }: { company: Company; sectors: string[]; onClose: () => void }) {
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
        <Modal onClose={onClose} title="Modifier l’entreprise" description="Ces informations apparaissent sur les documents de l’entreprise.">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <Field label="Nom" htmlFor="c-name" required error={errors.name}>
                        <TextInput id="c-name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Secteur" htmlFor="c-sector" error={errors.sector}>
                            <SelectInput id="c-sector" value={data.sector} onChange={(e) => setData('sector', e.target.value)} error={errors.sector}>
                                <option value="">—</option>
                                {[...new Set([...sectors, ...(data.sector ? [data.sector] : [])])].map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field label="Ville" htmlFor="c-city" error={errors.city}>
                            <TextInput id="c-city" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} />
                        </Field>
                    </div>
                    <Field label="Adresse" htmlFor="c-address" error={errors.address}>
                        <TextInput id="c-address" value={data.address} onChange={(e) => setData('address', e.target.value)} error={errors.address} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Téléphone" htmlFor="c-phone" error={errors.phone}>
                            <TextInput
                                id="c-phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                            />
                        </Field>
                        <Field label="E-mail de contact" htmlFor="c-email" error={errors.email}>
                            <TextInput
                                id="c-email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                            />
                        </Field>
                    </div>
                </div>
                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-sidebar-border dark:bg-white/[0.02]">
                    <ActionButton type="button" variant="secondary" onClick={onClose}>
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
    onEdit,
}: {
    companyId: number;
    companyActive: boolean;
    manager: Manager;
    onEdit: () => void;
}) {
    const post = (url: string) => router.post(url, {}, { preserveScroll: true, onError: toastFormError });

    return (
        <li className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{manager.name}</p>
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
                        {manager.last_login ? `Dernière connexion le ${manager.last_login}` : 'Jamais connecté'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {manager.invited ? (
                        <StatusBadge tone="warning">Invitation non ouverte</StatusBadge>
                    ) : manager.verified ? (
                        <StatusBadge tone="success">E-mail confirmé</StatusBadge>
                    ) : (
                        <StatusBadge tone="warning">E-mail non confirmé</StatusBadge>
                    )}
                    <button type="button" onClick={onEdit} aria-label={`Modifier ${manager.name}`} className={cn(buttonClass('ghost', 'sm'), 'px-2')}>
                        <Pencil />
                    </button>
                </div>
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
                                    Renvoyer la confirmation
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
                                Lien de nouveau mot de passe
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

/** Corriger le nom, l'e-mail ou le téléphone du gérant ; une nouvelle adresse doit être confirmée. */
function EditManagerModal({ companyId, manager, onClose }: { companyId: number; manager: Manager; onClose: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        name: manager.name,
        email: manager.email ?? '',
        phone: manager.phone ?? '',
    });

    const emailChanged = data.email.trim().toLowerCase() !== (manager.email ?? '').toLowerCase();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(managerUpdate({ company: companyId, user: manager.id }).url, {
            preserveScroll: true,
            onSuccess: onClose,
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={onClose} title="Modifier le gérant" description="Le mot de passe ne change pas : seul le gérant le choisit.">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <Field label="Nom complet" htmlFor="m-name" required error={errors.name}>
                        <TextInput id="m-name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} />
                    </Field>
                    <Field label="E-mail" htmlFor="m-email" required error={errors.email}>
                        <TextInput id="m-email" type="email" icon={Mail} value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
                    </Field>
                    <Field label="Téléphone" htmlFor="m-phone" hint="facultatif" error={errors.phone}>
                        <TextInput id="m-phone" type="tel" icon={Phone} value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} />
                    </Field>
                    {emailChanged && (
                        <p className="flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                            <MailCheck className="mt-0.5 size-4 shrink-0" />
                            {manager.invited
                                ? 'L’invitation sera envoyée à la nouvelle adresse.'
                                : 'La nouvelle adresse devra être confirmée : un e-mail de confirmation y sera envoyé.'}
                        </p>
                    )}
                </div>
                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-sidebar-border dark:bg-white/[0.02]">
                    <ActionButton type="button" variant="secondary" onClick={onClose}>
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

/** Forfait : nom, état, échéance, jauges d'utilisation. */
function PlanCard({ plan, companyId }: { plan: PlanState; companyId: number }) {
    const state = plan.expired
        ? { label: 'Expiré', className: 'bg-red-50 text-red-700 ring-red-600/15' }
        : plan.key === 'starter'
          ? { label: 'Gratuit', className: 'bg-slate-100 text-slate-600 ring-slate-500/15' }
          : plan.trial
            ? { label: 'Essai', className: 'bg-sky-50 text-sky-700 ring-sky-600/15' }
            : { label: 'Payant', className: 'bg-motriks-soft text-motriks-deep ring-green-600/15' };

    const detail = plan.expired
        ? `${plan.subscribed_label} terminé le ${plan.ends_on} : l’entreprise est repassée en Starter.`
        : plan.key === 'starter'
          ? 'Forfait gratuit, sans date de fin.'
          : `${plan.trial ? 'Essai' : 'Forfait'} ${plan.ends_on ? `jusqu’au ${plan.ends_on}` : 'sans date de fin'}${
                plan.days_left !== null && !plan.expired ? ` · J-${plan.days_left}` : ''
            }${packSummary(plan.extra_packs, plan.supervisor_packs) ? ` · ${packSummary(plan.extra_packs, plan.supervisor_packs)}` : ''}`;

    return (
        <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-ink">{plan.label}</h2>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', state.className)}>{state.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{detail}</p>
                </div>
                <div className="flex w-full items-baseline justify-between gap-3 sm:block sm:w-auto sm:text-right">
                    <p className="text-lg font-semibold text-ink tabular-nums">
                        {plan.monthly_price > 0 ? number.format(plan.monthly_price) : '0'}{' '}
                        <span className="text-xs font-normal text-slate-500">FCFA / mois</span>
                    </p>
                    <Link href={companyPlan(companyId).url} className="text-xs font-semibold text-motriks-deep hover:underline">
                        Changer de forfait
                    </Link>
                </div>
            </div>
            <PlanUsageList plan={plan} />
        </section>
    );
}

/** Paiements de l'entreprise, chacun avec sa facture (aperçu et PDF). */
function PaymentsList({ payments, onPreview }: { payments: Payment[]; onPreview: (p: Payment) => void }) {
    if (payments.length === 0) {
        return (
            <QuietEmpty icon={Receipt} title="Aucun paiement enregistré">
                « Paiement reçu » enregistre le paiement et crée la facture.
            </QuietEmpty>
        );
    }

    return (
        <ul className="divide-y divide-slate-100">
            {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                        <Receipt className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-0">
                        <p className="truncate text-sm font-semibold text-ink">
                            {number.format(p.amount)} {currencyLabel(p.currency)}
                            <span className="font-normal text-slate-400"> · {p.plan ?? 'Abonnement'}</span>
                        </p>
                        <p className="truncate text-xs text-slate-500">
                            <span className="font-medium text-slate-600 tabular-nums">{p.invoice_number}</span> · {p.method} · le {p.paid_at}
                            {p.period_end ? ` · jusqu’au ${p.period_end}` : ''}
                        </p>
                    </div>
                    <div className="ml-[3.25rem] flex gap-1.5 sm:ml-0">
                        <button type="button" onClick={() => onPreview(p)} className={buttonClass('ghost', 'sm')}>
                            <Eye />
                            Voir
                        </button>
                        <a href={invoiceDownload(p.id).url} download className={buttonClass('secondary', 'sm')}>
                            <Download />
                            PDF
                        </a>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function AdminCompanyShow({ company, managers, team, sites, usage, plan, documents, products, history, sectors, payments, billing }: Props) {
    const [tab, setTab] = useState<Tab>('overview');
    const [editingManager, setEditingManager] = useState<Manager | null>(null);
    const [editing, setEditing] = useState(false);
    const [paying, setPaying] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [preview, setPreview] = useState<Payment | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const status = STATUS[company.status];
    const suspending = company.status === 'active';
    const manageable = company.status === 'active' || company.status === 'suspended';

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

    const remind = () => router.post(subscriptionRemind(company.id).url, {}, { preserveScroll: true, onError: toastFormError });

    const openPreview = (p: Payment) => {
        setPreview(p);
        setPreviewOpen(true);
    };

    const meta = [company.city, company.sector, company.created_at ? `Inscrite le ${company.created_at}` : null].filter(Boolean).join(' · ');

    const lastReport = usage.last_report ? new Date(usage.last_report).toLocaleDateString('fr-FR') : null;

    const contacts: [string, ReactNode][] = [
        [
            'E-mail',
            company.email ? (
                <a href={`mailto:${company.email}`} className="hover:text-motriks-deep hover:underline">
                    {company.email}
                </a>
            ) : null,
        ],
        [
            'Téléphone',
            company.phone ? (
                <a href={`tel:${company.phone}`} className="hover:text-motriks-deep hover:underline">
                    {company.phone}
                </a>
            ) : null,
        ],
        ['Adresse', [company.address, company.city].filter(Boolean).join(', ') || null],
        ['Secteur', company.sector],
    ];

    const managersList =
        managers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">Aucun gérant.</p>
        ) : (
            <ul className="divide-y divide-slate-100">
                {managers.map((m) => (
                    <ManagerCard
                        key={m.id}
                        companyId={company.id}
                        companyActive={company.status === 'active'}
                        manager={m}
                        onEdit={() => setEditingManager(m)}
                    />
                ))}
            </ul>
        );

    return (
        <>
            <Head title={company.name} />

            <div className="mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* En-tête : identité de l'entreprise, puis les actions (les moins courantes dans le menu) */}
                <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        {company.logo_url ? (
                            <img
                                src={company.logo_url}
                                alt=""
                                className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-slate-900/10"
                            />
                        ) : (
                            <CompanyAvatar name={company.name} muted={company.status === 'suspended'} className="size-14 rounded-2xl text-base" />
                        )}
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-[1.65rem]">{company.name}</h1>
                                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            </div>
                            {meta && <p className="mt-1 text-sm text-slate-500">{meta}</p>}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <ActionButton variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>
                            Modifier
                        </ActionButton>
                        {manageable && (
                            <ActionButton icon={<Banknote />} onClick={() => setPaying(true)}>
                                Paiement reçu
                            </ActionButton>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button type="button" aria-label="Autres actions" className={cn(buttonClass('secondary'), 'w-10 px-0')}>
                                    <MoreHorizontal />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                                <DropdownMenuItem asChild>
                                    <Link href={companyPlan(company.id).url}>
                                        <Blocks />
                                        Changer de forfait
                                    </Link>
                                </DropdownMenuItem>
                                {billing.can_remind && (
                                    <DropdownMenuItem onSelect={remind}>
                                        <BellRing />
                                        Relancer pour l’échéance
                                    </DropdownMenuItem>
                                )}
                                {company.has_file && (
                                    <DropdownMenuItem asChild>
                                        <Link href={onboardingShow(company.id).url}>
                                            <FileText />
                                            Dossier d’inscription
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                {manageable && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem variant={suspending ? 'destructive' : 'default'} onSelect={() => setConfirming(true)}>
                                            {suspending ? <PauseCircle /> : <PlayCircle />}
                                            {suspending ? 'Suspendre l’entreprise' : 'Réactiver l’entreprise'}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {company.status === 'rejected' && company.rejection_reason && (
                    <p className="flex items-start gap-2.5 rounded-xl border border-red-200/70 bg-red-50/60 px-4 py-3 text-sm text-red-800">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                            <span className="font-semibold">Dossier rejeté.</span> Motif : {company.rejection_reason}
                        </span>
                    </p>
                )}
                {company.status === 'suspended' && (
                    <p className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <PauseCircle className="mt-0.5 size-4 shrink-0" />
                        Entreprise suspendue : ses utilisateurs ne peuvent plus se connecter. Les données sont conservées.
                    </p>
                )}

                <div>
                    <Segmented
                        label="Sections de la fiche"
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'overview', label: 'Vue d’ensemble' },
                            { value: 'billing', label: 'Abonnement', count: payments.length },
                            {
                                value: 'team',
                                label: 'Équipe et sites',
                                count: managers.length + team.supervisors + team.hostesses + team.accountants,
                            },
                            { value: 'products', label: 'Produits', count: products.length },
                            { value: 'history', label: 'Historique', count: history.length },
                        ]}
                    />
                </div>

                {tab === 'overview' && (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                {
                                    label: 'Rapports · 30 jours',
                                    value: usage.reports,
                                    sub: lastReport ? `Dernier le ${lastReport}` : 'Aucun rapport',
                                },
                                {
                                    label: 'Hôtesses actives · 30 jours',
                                    value: usage.active_hostesses,
                                    sub: `sur ${team.hostesses} inscrite${team.hostesses > 1 ? 's' : ''}`,
                                },
                                {
                                    label: 'Points de vente',
                                    value: sites.length,
                                    sub: `${team.supervisors} superviseur${team.supervisors > 1 ? 's' : ''}`,
                                },
                                {
                                    label: 'CA déclaré · 30 jours',
                                    value: (
                                        <>
                                            {number.format(Math.round(usage.revenue))}{' '}
                                            <span className="text-sm font-normal text-slate-500">{currencyLabel(company.currency)}</span>
                                        </>
                                    ),
                                },
                            ]}
                        />

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                            <div className="flex min-w-0 flex-col gap-6">
                                <PlanCard plan={plan} companyId={company.id} />
                                <Card title={managers.length > 1 ? 'Gérants' : 'Gérant'}>{managersList}</Card>
                            </div>

                            <div className="flex min-w-0 flex-col gap-6">
                                <Card title="Coordonnées">
                                    <dl className="flex flex-col gap-3.5 px-5 py-4 text-sm">
                                        {contacts.map(([label, value]) => (
                                            <div key={label} className="min-w-0">
                                                <dt className="text-xs text-slate-400">{label}</dt>
                                                <dd className="mt-0.5 break-words text-ink">{value || <span className="text-slate-400">—</span>}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </Card>

                                <Card title="Documents" aside={<span className="text-xs text-slate-400">{documentsCount(documents)}</span>}>
                                    <LegalDocumentsList
                                        documents={documents}
                                        compact
                                        uploadUrl={(type) => documentStore({ company: company.id, type }).url}
                                    />
                                </Card>

                                <Card
                                    title="Dernier paiement"
                                    aside={
                                        payments.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setTab('billing')}
                                                className="text-xs font-semibold text-motriks-deep hover:underline"
                                            >
                                                Tout voir
                                            </button>
                                        )
                                    }
                                >
                                    {payments.length === 0 ? (
                                        <p className="px-5 py-4 text-sm text-slate-400">Aucun paiement enregistré.</p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openPreview(payments[0])}
                                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/70"
                                        >
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-ink tabular-nums">
                                                    {number.format(payments[0].amount)} {currencyLabel(payments[0].currency)}
                                                </span>
                                                <span className="block truncate text-xs text-slate-500">
                                                    {payments[0].invoice_number} · le {payments[0].paid_at}
                                                </span>
                                            </span>
                                            <Eye className="size-4 shrink-0 text-slate-400" />
                                        </button>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'billing' && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <PlanCard plan={plan} companyId={company.id} />
                        <Card
                            title="Paiements et factures"
                            aside={
                                billing.can_remind && (
                                    <ActionButton size="sm" variant="ghost" icon={<BellRing />} onClick={remind}>
                                        Relancer
                                    </ActionButton>
                                )
                            }
                        >
                            <PaymentsList payments={payments} onPreview={openPreview} />
                        </Card>
                    </div>
                )}

                {tab === 'team' && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="flex min-w-0 flex-col gap-6">
                            <Card title={managers.length > 1 ? 'Gérants' : 'Gérant'}>{managersList}</Card>
                            <Card
                                title="Équipe"
                                aside={
                                    <Link href={usersIndex({ query: { company: company.id } }).url} className="text-xs font-semibold text-motriks-deep hover:underline">
                                        Gérer les comptes
                                    </Link>
                                }
                            >
                                <dl className="grid grid-cols-3 divide-x divide-slate-100">
                                    {[
                                        ['Superviseurs', team.supervisors],
                                        ['Hôtesses', team.hostesses],
                                        ['Comptables', team.accountants],
                                    ].map(([label, value]) => (
                                        <div key={label} className="px-5 py-4">
                                            <dt className="text-xs text-slate-500">{label}</dt>
                                            <dd className="mt-1 text-xl font-semibold text-ink tabular-nums">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </Card>
                        </div>
                        <Card title={`Points de vente · ${sites.length}`}>
                            {sites.length === 0 ? (
                                <p className="px-5 py-6 text-sm text-slate-400">Aucun point de vente créé.</p>
                            ) : (
                                <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
                                    {sites.map((s) => (
                                        <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <span
                                                    className={cn(
                                                        'size-1.5 shrink-0 rounded-full',
                                                        s.status === 'active' ? 'bg-motriks' : 'bg-slate-300',
                                                    )}
                                                    aria-hidden
                                                />
                                                <span className="truncate text-ink">{s.name}</span>
                                            </span>
                                            <span className="shrink-0 text-xs text-slate-500">{s.city ?? '—'}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                )}

                {tab === 'products' && <CompanyProducts products={products} currency={currencyLabel(company.currency)} />}

                {tab === 'history' && (
                    <Card title="Historique" aside={<span className="text-xs text-slate-400">25 derniers événements</span>}>
                        {history.length === 0 ? (
                            <p className="px-5 py-6 text-sm text-slate-400">Aucun événement enregistré.</p>
                        ) : (
                            <ol className="relative px-5 py-4">
                                {history.map((h, i) => (
                                    <li key={h.id} className="relative flex gap-4 pb-5 last:pb-0">
                                        {i < history.length - 1 && (
                                            <span className="absolute top-3 left-[5px] h-full w-px bg-slate-200" aria-hidden />
                                        )}
                                        <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-white bg-motriks ring-1 ring-green-600/20" />
                                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                                            <p className="text-sm text-ink">
                                                {auditLabel(h.action)}
                                                {h.user && <span className="text-slate-400"> · {h.user}</span>}
                                            </p>
                                            <span className="text-xs text-slate-400 tabular-nums">{h.at}</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>
                )}
            </div>

            {paying && (
                <RecordPaymentModal
                    company={{ id: company.id, name: company.name }}
                    plans={billing.plans}
                    methods={billing.methods}
                    packs={billing.packs}
                    currentPlan={plan.subscribed_key}
                    currentPacks={plan.extra_packs}
                    currentSupervisorPacks={plan.supervisor_packs}
                    onClose={() => setPaying(false)}
                />
            )}

            {editing && <EditCompanyModal company={company} sectors={sectors} onClose={() => setEditing(false)} />}

            {editingManager && <EditManagerModal companyId={company.id} manager={editingManager} onClose={() => setEditingManager(null)} />}

            <InvoicePreviewModal invoice={preview} open={previewOpen} onClose={() => setPreviewOpen(false)} client={company.name} urls={ADMIN_URLS} />

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={suspending ? `Suspendre « ${company.name} » ?` : `Réactiver « ${company.name} » ?`}
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
