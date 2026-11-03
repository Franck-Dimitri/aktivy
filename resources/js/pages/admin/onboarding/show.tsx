import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileImage,
    FileText,
    FileX2,
    Mail,
    MapPin,
    Maximize2,
    Phone,
    ShieldCheck,
    User,
    XCircle,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, TextArea } from '@/components/page/form-fields';
import { CompanyAvatar } from '@/components/page/list-kit';
import { Modal } from '@/components/page/modal';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { approve, document as docRoute, index as onboardingIndex, reject } from '@/routes/admin/onboarding';

type DocType = 'id_card_front' | 'id_card_back' | 'registration_doc';
type DocKind = 'image' | 'pdf' | null;

type CompanyData = {
    id: number;
    name: string;
    sector: string | null;
    city: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    rejection_reason: string | null;
    onboarding_completed_at: string | null;
    logo_url: string | null;
    documents: Record<DocType, DocKind>;
};

type Props = {
    company: CompanyData;
    admin: { name: string | null; email: string | null; phone: string | null };
};

const DOCS: { type: DocType; label: string; hint: string; icon: typeof FileText }[] = [
    { type: 'id_card_front', label: 'Pièce d’identité', hint: 'Recto', icon: FileImage },
    { type: 'id_card_back', label: 'Pièce d’identité', hint: 'Verso', icon: FileImage },
    { type: 'registration_doc', label: 'Document légal', hint: 'RCCM, patente…', icon: FileText },
];

const STATUS: Record<string, { tone: StatusTone; label: string }> = {
    pending: { tone: 'warning', label: 'À examiner' },
    rejected: { tone: 'danger', label: 'Rejeté' },
    active: { tone: 'success', label: 'Active' },
    suspended: { tone: 'danger', label: 'Suspendue' },
};

const REASONS = [
    'Pièce d’identité illisible ou coupée',
    'Document légal manquant ou expiré',
    'Informations différentes de celles des documents',
    'Entreprise introuvable au registre du commerce',
];

/* ───────────────────────── Documents ───────────────────────── */

function DocumentCard({ companyId, doc, kind, onZoom }: { companyId: number; doc: (typeof DOCS)[number]; kind: DocKind; onZoom: (url: string, label: string) => void }) {
    const Icon = doc.icon;
    const title = `${doc.label} · ${doc.hint}`;

    if (!kind) {
        return (
            <div className="flex flex-col overflow-hidden rounded-xl border border-dashed border-slate-200 dark:border-sidebar-border">
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-slate-50/60 text-slate-300 dark:bg-white/[0.02]">
                    <FileX2 className="size-7" />
                    <span className="text-xs font-medium text-slate-400">Non fourni</span>
                </div>
                <div className="flex items-center gap-2 border-t border-dashed border-slate-200 px-3.5 py-2.5 dark:border-sidebar-border">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-400">{doc.label}</p>
                    <span className="text-[11px] text-slate-400">{doc.hint}</span>
                </div>
            </div>
        );
    }

    const url = docRoute({ company: companyId, type: doc.type }).url;

    return (
        <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-shadow hover:shadow-md hover:shadow-slate-900/[0.05] dark:border-sidebar-border dark:bg-card">
            <div className="relative aspect-[4/3] overflow-hidden bg-[repeating-conic-gradient(#f8fafc_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                {kind === 'image' ? (
                    <button type="button" onClick={() => onZoom(url, title)} className="flex size-full items-center justify-center p-3 focus-visible:outline-none" aria-label={`Agrandir : ${title}`}>
                        <img src={url} alt={title} loading="lazy" className="max-h-full max-w-full rounded-md object-contain shadow-sm transition-transform duration-300 group-hover:scale-[1.02]" />
                        <span className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-lg bg-slate-900/70 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                            <Maximize2 className="size-3.5" />
                        </span>
                    </button>
                ) : (
                    <iframe src={`${url}#toolbar=0&view=FitH`} title={title} className="size-full" />
                )}
            </div>
            <div className="flex items-center gap-2.5 border-t border-slate-100 px-3.5 py-2.5 dark:border-sidebar-border">
                <Icon className="size-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{doc.label}</p>
                    <p className="text-[11px] text-slate-400">
                        {doc.hint} · {kind === 'pdf' ? 'PDF' : 'Image'}
                    </p>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'icon')} aria-label={`Ouvrir ${title} dans un nouvel onglet`}>
                    <ExternalLink />
                </a>
            </div>
        </div>
    );
}

/* ───────────────────────── Fiches ───────────────────────── */

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <h2 className="border-b border-slate-100 px-5 py-3.5 text-[13px] font-semibold text-ink dark:border-sidebar-border">{title}</h2>
            <dl className="divide-y divide-slate-100 px-5 dark:divide-sidebar-border">{children}</dl>
        </section>
    );
}

function Info({ icon: Icon, label, value, href }: { icon: typeof User; label: string; value: string | null; href?: string }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-slate-300" />
            <div className="min-w-0 flex-1">
                <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
                <dd className={cn('mt-0.5 text-sm break-words', value ? 'font-medium text-ink' : 'text-slate-300')}>
                    {value && href ? (
                        <a href={href} className="hover:text-motriks-deep hover:underline">
                            {value}
                        </a>
                    ) : (
                        (value ?? 'Non renseigné')
                    )}
                </dd>
            </div>
        </div>
    );
}

/* ───────────────────────── Page ───────────────────────── */

export default function AdminOnboardingShow({ company, admin }: Props) {
    const [zoom, setZoom] = useState<{ url: string; label: string } | null>(null);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const approveForm = useForm({});
    const rejectForm = useForm({ reason: '' });

    const isPending = company.status === 'pending';
    const status = STATUS[company.status] ?? { tone: 'neutral' as StatusTone, label: company.status };
    const provided = DOCS.filter((d) => company.documents[d.type]).length;
    const complete = provided === DOCS.length;

    const doApprove = () =>
        approveForm.post(approve({ company: company.id }).url, {
            onSuccess: () => toast.success('Entreprise activée', { description: `« ${company.name} » a reçu un e-mail de confirmation.` }),
            onError: () => toast.error('L’activation a échoué, réessayez.'),
            onFinish: () => setApproving(false),
        });

    const doReject = (e: FormEvent) => {
        e.preventDefault();
        rejectForm.post(reject({ company: company.id }).url, {
            onSuccess: () => toast.success('Demande rejetée', { description: 'Le gérant a reçu le motif par e-mail.' }),
            onError: toastFormError,
        });
    };

    const addReason = (r: string) => {
        const current = rejectForm.data.reason.trim();
        if (current.includes(r)) return;
        rejectForm.setData('reason', current ? `${current}\n${r}.` : `${r}.`);
    };

    return (
        <>
            <Head title={`Dossier — ${company.name}`} />

            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* En-tête du dossier */}
                <div className="flex flex-col gap-5">
                    <Link href={onboardingIndex().url} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-ink">
                        <ArrowLeft className="size-3.5" />
                        Demandes d’inscription
                    </Link>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {company.logo_url ? (
                            <img src={company.logo_url} alt="" className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-slate-200 dark:ring-sidebar-border" />
                        ) : (
                            <CompanyAvatar name={company.name} className="size-14 rounded-2xl text-lg" />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-[1.65rem]">{company.name}</h1>
                                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                {[company.sector, company.city].filter(Boolean).join(' · ') || 'Demande d’inscription'}
                                {company.onboarding_completed_at && <span className="text-slate-400"> · soumis le {company.onboarding_completed_at}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    {/* Colonne principale */}
                    <div className="flex flex-col gap-6">
                        {company.status === 'rejected' && company.rejection_reason && (
                            <div className="flex gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200/70 dark:bg-red-500/10 dark:ring-red-500/20">
                                <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
                                <div>
                                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">Dossier rejeté</p>
                                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-red-700/90 dark:text-red-300/80">{company.rejection_reason}</p>
                                    <p className="mt-2 text-xs text-red-600/70">Il repassera « À examiner » dès que le gérant renverra ses documents.</p>
                                </div>
                            </div>
                        )}

                        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-sidebar-border">
                                <h2 className="text-[13px] font-semibold text-ink">Documents soumis</h2>
                                <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', complete ? 'text-motriks-deep' : 'text-amber-600')}>
                                    {complete ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                                    {provided} sur {DOCS.length} fournis
                                </span>
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                                {DOCS.map((d) => (
                                    <DocumentCard key={d.type} companyId={company.id} doc={d} kind={company.documents[d.type]} onZoom={(url, label) => setZoom({ url, label })} />
                                ))}
                            </div>
                        </section>

                        <div className="grid gap-6 md:grid-cols-2">
                            <InfoCard title="Entreprise">
                                <Info icon={Building2} label="Raison sociale" value={company.name} />
                                <Info icon={ShieldCheck} label="Secteur" value={company.sector} />
                                <Info icon={MapPin} label="Adresse" value={[company.address, company.city].filter(Boolean).join(', ') || null} />
                                <Info icon={Mail} label="E-mail" value={company.email} href={company.email ? `mailto:${company.email}` : undefined} />
                                <Info icon={Phone} label="Téléphone" value={company.phone} href={company.phone ? `tel:${company.phone}` : undefined} />
                            </InfoCard>

                            <InfoCard title="Gérant">
                                <Info icon={User} label="Nom" value={admin.name} />
                                <Info icon={Mail} label="E-mail" value={admin.email} href={admin.email ? `mailto:${admin.email}` : undefined} />
                                <Info icon={Phone} label="Téléphone" value={admin.phone} href={admin.phone ? `tel:${admin.phone}` : undefined} />
                            </InfoCard>
                        </div>
                    </div>

                    {/* Décision */}
                    <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
                        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                            <div className="p-5">
                                {isPending ? (
                                    <>
                                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                            <Clock className="size-4 text-amber-500" />
                                            En attente de votre décision
                                        </p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">L’approbation ouvre l’espace client et prévient le gérant par e-mail. Un refus lui est envoyé avec son motif.</p>
                                    </>
                                ) : company.status === 'active' ? (
                                    <>
                                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                            <CheckCircle2 className="size-4 text-motriks" />
                                            Compte actif
                                        </p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Cette entreprise a accès à Motriks. La suspension se gère depuis la liste des entreprises.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                            <XCircle className="size-4 text-red-500" />
                                            {company.status === 'rejected' ? 'Demande rejetée' : status.label}
                                        </p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Aucune décision n’est attendue pour le moment.</p>
                                    </>
                                )}
                            </div>

                            <ul className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs dark:border-sidebar-border dark:bg-white/[0.02]">
                                {[
                                    { ok: complete, label: `Documents fournis (${provided}/${DOCS.length})` },
                                    { ok: !!admin.email, label: 'E-mail du gérant renseigné' },
                                    { ok: !!(company.phone || admin.phone), label: 'Un numéro de téléphone' },
                                    { ok: !!company.city, label: 'Ville renseignée' },
                                ].map(({ ok, label }) => (
                                    <li key={label} className={cn('flex items-center gap-2', ok ? 'text-slate-600' : 'text-amber-700')}>
                                        {ok ? <CheckCircle2 className="size-3.5 text-motriks" /> : <AlertCircle className="size-3.5 text-amber-500" />}
                                        {label}
                                    </li>
                                ))}
                            </ul>

                            {isPending && (
                                <div className="flex flex-col gap-2 border-t border-slate-100 p-4 dark:border-sidebar-border">
                                    <ActionButton icon={<CheckCircle2 />} onClick={() => setApproving(true)} className="w-full">
                                        Approuver et activer
                                    </ActionButton>
                                    <ActionButton variant="icon-danger" icon={<XCircle />} onClick={() => setRejecting(true)} className="h-10 w-full rounded-xl text-sm">
                                        Rejeter le dossier
                                    </ActionButton>
                                </div>
                            )}
                        </section>
                    </aside>
                </div>
            </div>

            {zoom && (
                <Modal onClose={() => setZoom(null)} title={zoom.label} size="lg">
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4 dark:bg-white/[0.02]">
                        <img src={zoom.url} alt={zoom.label} className="max-h-[70vh] w-auto rounded-lg object-contain shadow-sm" />
                    </div>
                    <footer className="flex justify-end border-t border-slate-100 px-6 py-3 dark:border-sidebar-border">
                        <a href={zoom.url} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'sm')}>
                            <ExternalLink />
                            Ouvrir dans un onglet
                        </a>
                    </footer>
                </Modal>
            )}

            <ConfirmDialog
                open={approving}
                onOpenChange={setApproving}
                tone="primary"
                icon={CheckCircle2}
                title={`Activer « ${company.name} » ?`}
                description={
                    complete
                        ? 'L’espace client sera ouvert immédiatement et le gérant recevra un e-mail de confirmation.'
                        : `Attention : seuls ${provided} documents sur ${DOCS.length} ont été fournis. L’espace client sera tout de même ouvert et le gérant prévenu par e-mail.`
                }
                confirmLabel="Approuver et activer"
                loading={approveForm.processing}
                onConfirm={doApprove}
            />

            {rejecting && (
                <Modal
                    onClose={() => !rejectForm.processing && setRejecting(false)}
                    title="Rejeter le dossier"
                    description={`Le motif sera envoyé par e-mail au gérant de « ${company.name} ».`}
                    icon={<XCircle />}
                >
                    <form onSubmit={doReject} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex flex-col gap-4 overflow-y-auto px-6 pt-3 pb-6">
                            <div>
                                <p className="mb-2 text-xs font-medium text-slate-500">Motifs fréquents</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {REASONS.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => addReason(r)}
                                            className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-ink hover:ring-slate-300 dark:text-slate-300 dark:ring-sidebar-border dark:hover:bg-white/5"
                                        >
                                            + {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Field label="Motif du refus" htmlFor="reason" required error={rejectForm.errors.reason}>
                                <TextArea
                                    id="reason"
                                    rows={4}
                                    value={rejectForm.data.reason}
                                    onChange={(e) => rejectForm.setData('reason', e.target.value)}
                                    placeholder="Expliquez ce que le gérant doit corriger avant de renvoyer son dossier."
                                    maxLength={500}
                                    error={rejectForm.errors.reason}
                                    required
                                    autoFocus
                                />
                                <p className="mt-1 text-right text-[11px] text-slate-400 tabular-nums">{rejectForm.data.reason.length}/500</p>
                            </Field>
                        </div>
                        <footer className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-sidebar-border">
                            <ActionButton variant="secondary" onClick={() => setRejecting(false)} disabled={rejectForm.processing}>
                                Annuler
                            </ActionButton>
                            <ActionButton type="submit" variant="danger" icon={<XCircle />} loading={rejectForm.processing} disabled={!rejectForm.data.reason.trim()}>
                                Rejeter et prévenir
                            </ActionButton>
                        </footer>
                    </form>
                </Modal>
            )}
        </>
    );
}

AdminOnboardingShow.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: "Demandes d'inscription", href: onboardingIndex() },
    ],
};
