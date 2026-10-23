import { Head, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileImage,
    FileText,
    MapPin,
    Mail,
    Phone,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { Field, TextArea } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import {
    index as onboardingIndex,
    approve,
    reject,
    document as docRoute,
} from '@/routes/admin/onboarding';

// ── Types ─────────────────────────────────────────────────────────────

type CompanyData = {
    id: number; name: string; sector: string | null; city: string | null; address: string | null;
    email: string | null; phone: string | null; status: string; rejection_reason: string | null;
    onboarding_completed_at: string | null; logo_url: string | null;
    has_id_card_front: boolean; has_id_card_back: boolean; has_registration_doc: boolean;
};

type Props = {
    company: CompanyData;
    admin: { name: string | null; email: string | null; phone: string | null };
    flash?: { success?: string };
};

// ── Document link ─────────────────────────────────────────────────────

function DocLink({ label, hasFile, companyId, type, icon: Icon }: {
    label: string; hasFile: boolean; companyId: number; type: string; icon: typeof FileText;
}) {
    if (!hasFile) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <Icon className="size-4 shrink-0 text-slate-200" />
                <p className="text-sm text-slate-300 italic">Non fourni</p>
            </div>
        );
    }

    return (
        <a href={docRoute({ company: companyId, type }).url} target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm">
            <Icon className="size-4 shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <p className="flex-1 text-sm font-medium text-slate-700 group-hover:text-blue-700">{label}</p>
            <ExternalLink className="size-3.5 shrink-0 text-slate-300 transition-opacity group-hover:text-blue-400" />
        </a>
    );
}

// ── Info row ──────────────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Building2 }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                {Icon && <Icon className="size-3.5 shrink-0 text-slate-300" />}
                {label}
            </div>
            <p className="text-sm font-semibold text-ink text-right">{value}</p>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function AdminOnboardingShow({ company, admin, flash }: Props) {
    const [showRejectForm, setShowRejectForm] = useState(false);

    const approveForm = useForm({});
    const rejectForm  = useForm({ reason: company.rejection_reason ?? '' });

    const isPending  = company.status === 'pending';
    const isRejected = company.status === 'rejected';
    const isActive   = company.status === 'active';

    return (
        <>
            <Head title={`Dossier — ${company.name}`} />

            <Page
                title={company.name}
                description={[company.sector, company.city].filter(Boolean).join(' · ') || 'Demande d\'inscription'}
            >
                {/* Status banner */}
                {isPending && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                        <Clock className="size-4 shrink-0 text-amber-500" />
                        <span className="text-amber-700">
                            Dossier soumis le <strong>{company.onboarding_completed_at}</strong> — en attente de validation
                        </span>
                    </div>
                )}
                {isRejected && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                            <AlertCircle className="size-4 shrink-0" /> Dossier rejeté
                        </p>
                        {company.rejection_reason && (
                            <p className="mt-1 text-sm leading-relaxed text-red-600">{company.rejection_reason}</p>
                        )}
                    </div>
                )}
                {isActive && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        <CheckCircle2 className="size-4 shrink-0" />
                        Compte actif
                    </div>
                )}
                {flash?.success && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Entreprise */}
                    <Panel title="Entreprise">
                        {company.logo_url && (
                            <div className="border-b border-slate-100 px-5 py-4">
                                <img src={company.logo_url} alt="Logo" className="h-12 w-auto rounded-xl object-contain" />
                            </div>
                        )}
                        <div className="divide-y divide-slate-100 px-5">
                            {[
                                { label: 'Raison sociale', value: company.name, icon: Building2 },
                                { label: 'Secteur',         value: company.sector },
                                { label: 'Ville',           value: company.city, icon: MapPin },
                                { label: 'Adresse',         value: company.address },
                                { label: 'Email',           value: company.email, icon: Mail },
                                { label: 'Téléphone',       value: company.phone, icon: Phone },
                            ].filter(({ value }) => value).map(({ label, value, icon }) => (
                                <InfoRow key={label} label={label} value={value!} icon={icon as typeof Building2} />
                            ))}
                        </div>
                    </Panel>

                    {/* Gérant */}
                    <Panel title="Gérant / Administrateur">
                        <div className="divide-y divide-slate-100 px-5">
                            {[
                                { label: 'Nom',       value: admin.name,  icon: User },
                                { label: 'Email',     value: admin.email, icon: Mail },
                                { label: 'Téléphone', value: admin.phone, icon: Phone },
                            ].filter(({ value }) => value).map(({ label, value, icon }) => (
                                <InfoRow key={label} label={label} value={value!} icon={icon as typeof Building2} />
                            ))}
                        </div>
                    </Panel>

                    {/* Documents */}
                    <Panel title="Documents soumis" className="lg:col-span-2">
                        <div className="grid gap-3 p-5 sm:grid-cols-3">
                            <DocLink label="Pièce d'identité — recto" hasFile={company.has_id_card_front}
                                companyId={company.id} type="id_card_front" icon={FileImage} />
                            <DocLink label="Pièce d'identité — verso" hasFile={company.has_id_card_back}
                                companyId={company.id} type="id_card_back" icon={FileImage} />
                            <DocLink label="Document légal" hasFile={company.has_registration_doc}
                                companyId={company.id} type="registration_doc" icon={FileText} />
                        </div>
                    </Panel>
                </div>

                {/* ── Decision section ── */}
                {(isPending || isRejected) && (
                    <Panel
                        title="Décision"
                        description="Approuvez le dossier pour activer l'espace client, ou rejetez-le en précisant le motif."
                        className="mt-5"
                    >
                        <div className="p-5">
                            {!showRejectForm ? (
                                <div className="flex flex-wrap gap-3">
                                    <ActionButton
                                        icon={<CheckCircle2 />}
                                        onClick={() => approveForm.post(approve({ company: company.id }).url)}
                                        loading={approveForm.processing}
                                    >
                                        Approuver et activer
                                    </ActionButton>
                                    <ActionButton
                                        variant="secondary"
                                        icon={<AlertCircle />}
                                        onClick={() => setShowRejectForm(true)}
                                    >
                                        Rejeter le dossier
                                    </ActionButton>
                                </div>
                            ) : (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        rejectForm.post(reject({ company: company.id }).url, {
                                            onSuccess: () => setShowRejectForm(false),
                                        });
                                    }}
                                    className="flex flex-col gap-4"
                                >
                                    <Field
                                        label="Motif du refus"
                                        required
                                        hint="Visible par le gérant de l'entreprise"
                                        error={rejectForm.errors.reason}
                                    >
                                        <TextArea
                                            value={rejectForm.data.reason}
                                            onChange={(e) => rejectForm.setData('reason', e.target.value)}
                                            placeholder="Documents illisibles, informations incohérentes, entreprise non reconnue…"
                                            required
                                            rows={3}
                                            error={rejectForm.errors.reason}
                                        />
                                    </Field>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowRejectForm(false)}
                                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                        >
                                            Annuler
                                        </button>
                                        <ActionButton
                                            type="submit"
                                            variant="danger"
                                            icon={<AlertCircle />}
                                            loading={rejectForm.processing}
                                        >
                                            Confirmer le rejet
                                        </ActionButton>
                                    </div>
                                </form>
                            )}
                        </div>
                    </Panel>
                )}
            </Page>
        </>
    );
}

AdminOnboardingShow.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Demandes d\'inscription', href: onboardingIndex() },
    ],
};
