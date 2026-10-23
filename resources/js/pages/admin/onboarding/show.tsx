import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Building2, CheckCircle2, ExternalLink, FileImage, FileText, MapPin, Phone, User } from 'lucide-react';
import { useState } from 'react';
import { GlowCard } from '@/components/page/surface';
import { ActionButton } from '@/components/page/buttons';
import { Page } from '@/components/page/page';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as onboardingIndex, show as onboardingShow, approve, reject, document as docRoute } from '@/routes/admin/onboarding';

type Props = {
    company: {
        id: number; name: string; sector: string | null; city: string | null; address: string | null;
        email: string | null; phone: string | null; status: string; rejection_reason: string | null;
        onboarding_completed_at: string | null; logo_url: string | null;
        has_id_card_front: boolean; has_id_card_back: boolean; has_registration_doc: boolean;
    };
    admin: { name: string | null; email: string | null; phone: string | null };
};

function DocPreview({ label, hasFile, companyId, type, icon: Icon }: {
    label: string; hasFile: boolean; companyId: number; type: string; icon: typeof FileText;
}) {
    if (!hasFile) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <Icon className="size-5 shrink-0 text-slate-300" />
                <p className="text-sm text-slate-400 italic">Non fourni</p>
            </div>
        );
    }
    const url = docRoute({ company: companyId, type }).url;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 transition hover:bg-blue-100/70 group">
            <Icon className="size-5 shrink-0 text-blue-500" />
            <p className="flex-1 text-sm font-medium text-blue-700">{label}</p>
            <ExternalLink className="size-4 shrink-0 text-blue-400 opacity-0 transition group-hover:opacity-100" />
        </a>
    );
}

export default function AdminOnboardingShow({ company, admin }: Props) {
    const [showRejectForm, setShowRejectForm] = useState(false);

    const approveForm = useForm({});
    const rejectForm  = useForm({ reason: '' });

    function handleApprove() {
        approveForm.post(approve({ company: company.id }).url);
    }

    function handleReject(e: React.FormEvent) {
        e.preventDefault();
        rejectForm.post(reject({ company: company.id }).url, {
            onSuccess: () => setShowRejectForm(false),
        });
    }

    const isPending  = company.status === 'pending';
    const isRejected = company.status === 'rejected';

    return (
        <>
            <Head title={`Dossier — ${company.name}`} />

            <Page
                title={company.name}
                description={[company.sector, company.city].filter(Boolean).join(' · ')}
            >
                {/* Status banner */}
                {isPending && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                        <AlertCircle className="size-4 shrink-0" />
                        Dossier soumis le {company.onboarding_completed_at} — en attente de validation
                    </div>
                )}
                {isRejected && (
                    <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                            <AlertCircle className="size-4 shrink-0" /> Dossier rejeté
                        </p>
                        {company.rejection_reason && (
                            <p className="mt-1 text-sm text-red-600">{company.rejection_reason}</p>
                        )}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-2">
                    {/* ── Infos entreprise ── */}
                    <GlowCard contentClassName="p-5">
                        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                            <Building2 className="size-3.5" /> Entreprise
                        </p>
                        {company.logo_url && (
                            <img src={company.logo_url} alt="Logo" className="mb-4 h-14 w-auto rounded-xl object-contain ring-1 ring-slate-100" />
                        )}
                        <dl className="grid gap-3">
                            {[
                                { label: 'Nom', value: company.name },
                                { label: 'Secteur', value: company.sector },
                                { label: 'Ville', value: company.city },
                                { label: 'Adresse', value: company.address },
                                { label: 'Email', value: company.email },
                                { label: 'Téléphone', value: company.phone },
                            ].map(({ label, value }) => value ? (
                                <div key={label}>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                                    <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
                                </div>
                            ) : null)}
                        </dl>
                    </GlowCard>

                    {/* ── Gérant ── */}
                    <GlowCard contentClassName="p-5">
                        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                            <User className="size-3.5" /> Gérant / Administrateur
                        </p>
                        <dl className="grid gap-3">
                            {[
                                { label: 'Nom', value: admin.name },
                                { label: 'Email', value: admin.email },
                                { label: 'Téléphone', value: admin.phone },
                            ].map(({ label, value }) => value ? (
                                <div key={label}>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                                    <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
                                </div>
                            ) : null)}
                        </dl>
                    </GlowCard>

                    {/* ── Documents ── */}
                    <GlowCard contentClassName="p-5 lg:col-span-2">
                        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                            <FileText className="size-3.5" /> Documents soumis
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <DocPreview label="Pièce d'identité (recto)" hasFile={company.has_id_card_front}
                                companyId={company.id} type="id_card_front" icon={FileImage} />
                            <DocPreview label="Pièce d'identité (verso)" hasFile={company.has_id_card_back}
                                companyId={company.id} type="id_card_back" icon={FileImage} />
                            <DocPreview label="Registre de commerce" hasFile={company.has_registration_doc}
                                companyId={company.id} type="registration_doc" icon={FileText} />
                        </div>
                    </GlowCard>
                </div>

                {/* ── Actions ── */}
                {(isPending || isRejected) && (
                    <div className="mt-6 flex flex-col gap-4">
                        {!showRejectForm ? (
                            <div className="flex flex-wrap gap-3">
                                <ActionButton
                                    icon={<CheckCircle2 />}
                                    onClick={handleApprove}
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
                            <GlowCard contentClassName="p-5">
                                <p className="mb-3 text-sm font-bold text-slate-700">Motif du refus</p>
                                <form onSubmit={handleReject} className="flex flex-col gap-3">
                                    <textarea
                                        value={rejectForm.data.reason}
                                        onChange={(e) => rejectForm.setData('reason', e.target.value)}
                                        required
                                        placeholder="Expliquez pourquoi le dossier est rejeté (documents illisibles, informations incorrectes…)"
                                        rows={3}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                                    />
                                    {rejectForm.errors.reason && (
                                        <p className="text-xs font-medium text-red-600">{rejectForm.errors.reason}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowRejectForm(false)}
                                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                                            Annuler
                                        </button>
                                        <ActionButton type="submit" variant="secondary" icon={<AlertCircle />} loading={rejectForm.processing}>
                                            Confirmer le rejet
                                        </ActionButton>
                                    </div>
                                </form>
                            </GlowCard>
                        )}
                    </div>
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
