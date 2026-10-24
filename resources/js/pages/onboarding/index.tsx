import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    Clock,
    FileText,
    Loader2,
    Lock,
    MapPin,
    Phone,
    RefreshCw,
    Settings,
    Upload,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';
import { logout } from '@/routes';
import { store as onboardingStore } from '@/routes/onboarding';
import { ActionButton } from '@/components/page/buttons';
import { Field, FormActions, SelectInput, TextInput } from '@/components/page/form-fields';
import { GlowCard, GlowStyles } from '@/components/page/surface';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

type Company = {
    id: number; name: string; email: string | null; phone: string | null;
    sector: string | null; city: string | null; address: string | null;
    status: 'pending' | 'rejected'; logo_url: string | null;
    onboarding_completed: boolean; onboarding_completed_at: string | null;
    rejection_reason: string | null;
};

type Props = {
    company: Company;
    user: { name: string; email: string; phone: string | null };
    sectors: string[];
};

// ── Frozen tab placeholder ─────────────────────────────────────────────────

function FrozenTab({ icon: Icon, label }: { icon: typeof Building2; label: string }) {
    return (
        <div className="flex cursor-not-allowed select-none items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 opacity-60">
            <Icon className="size-4" />
            {label}
            <Lock className="size-3 text-slate-300" />
        </div>
    );
}

// ── File picker ────────────────────────────────────────────────────────────

function FilePicker({
    label, name, required, accept, error, value, onChange, hint, maxMb = 5, keepPng = false,
}: {
    label: string; name: string; required?: boolean; accept: string;
    error?: string; value: File | null; onChange: (f: File | null) => void; hint?: string;
    maxMb?: number; keepPng?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [preparing, setPreparing] = useState(false);
    const [localError, setLocalError] = useState<string>();

    // Aperçu créé une seule fois par fichier, libéré quand il change
    const preview = useMemo(() => (value && value.type.startsWith('image/') ? URL.createObjectURL(value) : null), [value]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const pick = () => ref.current?.click();

    async function select(file: File | null) {
        if (ref.current) ref.current.value = ''; // permet de rechoisir le même fichier
        if (!file) return;

        setLocalError(undefined);
        setPreparing(true);

        const ready = await compressImage(file, { keepPng });
        setPreparing(false);

        if (ready.size > maxMb * 1024 * 1024) {
            setLocalError(`Fichier trop lourd (${(ready.size / 1024 / 1024).toFixed(1)} Mo) : maximum ${maxMb} Mo. Prenez une photo plutôt qu’un scan haute définition.`);
            return;
        }

        onChange(ready);
    }

    const shownError = localError ?? error;
    const size = value ? (value.size > 1024 * 1024 ? `${(value.size / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(value.size / 1024)} Ko`) : '';

    return (
        <Field label={label} required={required} hint={hint} error={shownError}>
            <input ref={ref} type="file" name={name} accept={accept} className="sr-only"
                onChange={(e) => select(e.target.files?.[0] ?? null)} />

            {preparing ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Loader2 className="size-4 shrink-0 animate-spin text-motriks" />
                    <p className="text-sm text-slate-500">Préparation de l’image…</p>
                </div>
            ) : value ? (
                <div className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 ring-1',
                    shownError ? 'border-red-200 bg-red-50/40 ring-red-100' : 'border-motriks/30 bg-motriks-soft ring-motriks/10',
                )}>
                    <button type="button" onClick={pick} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Changer ${label}`}>
                        {preview
                            ? <img src={preview} alt="" className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-motriks/20" />
                            : <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200"><FileText className="size-4 text-slate-400" /></div>
                        }
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-motriks-deep">{value.name}</span>
                            <span className="block text-xs text-slate-500">{size}</span>
                        </span>
                    </button>
                    <button type="button" onClick={pick}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-motriks-deep ring-1 ring-motriks/25 transition hover:bg-white">
                        Changer
                    </button>
                    {!required && (
                        <button type="button" onClick={() => { onChange(null); setLocalError(undefined); }}
                            aria-label={`Retirer ${label}`}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-500">
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
            ) : (
                <button type="button" onClick={pick}
                    className={cn(
                        'group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed py-6 transition-all hover:border-motriks hover:bg-motriks-soft/40',
                        shownError ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50/40',
                    )}>
                    <Upload className={cn('size-5 transition', shownError ? 'text-red-300' : 'text-slate-300 group-hover:text-motriks')} />
                    <span className="text-xs font-medium text-slate-500">Choisir un fichier ou prendre une photo</span>
                    <span className="text-[11px] text-slate-400">{accept.includes('pdf') ? 'JPG · PNG · PDF' : 'JPG · PNG · WebP'} — max {maxMb} Mo</span>
                </button>
            )}
        </Field>
    );
}

// ── Wizard form (2 steps) ──────────────────────────────────────────────────

function OnboardingForm({ company, sectors }: Pick<Props, 'company' | 'sectors'>) {
    const [step, setStep] = useState(0);
    const step1Ref = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm<{
        sector: string; city: string; address: string; phone: string;
        logo: File | null; id_card_front: File | null; id_card_back: File | null; registration_doc: File | null;
    }>({
        sector: company.sector ?? '', city: company.city ?? '',
        address: company.address ?? '', phone: company.phone ?? '',
        logo: null, id_card_front: null, id_card_back: null, registration_doc: null,
    });

    function goNext(e: React.FormEvent) {
        e.preventDefault();
        const inputs = step1Ref.current?.querySelectorAll('input, select') ?? [];
        for (const input of inputs) {
            if (!(input as HTMLInputElement).reportValidity()) return;
        }
        setStep(1);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(onboardingStore().url, { forceFormData: true });
    }

    const STEPS = ['Informations', 'Documents'];

    return (
        <div className="flex flex-col gap-6">
            {/* Step indicator */}
            <div className="flex items-center gap-3">
                {STEPS.map((label, i) => (
                    <div key={label} className="flex items-center gap-2">
                        <div className={cn(
                            'flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                            i < step ? 'bg-motriks text-white' : i === step ? 'bg-motriks text-white ring-4 ring-motriks/20' : 'bg-slate-100 text-slate-400',
                        )}>
                            {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
                        </div>
                        <span className={cn('text-sm font-semibold', i === step ? 'text-ink' : 'text-slate-400')}>{label}</span>
                        {i < STEPS.length - 1 && <div className={cn('ml-1 h-px w-8 transition-colors', i < step ? 'bg-motriks' : 'bg-slate-200')} />}
                    </div>
                ))}
            </div>

            {/* Step 1 — Company info */}
            <div ref={step1Ref} hidden={step !== 0}>
                <form onSubmit={goNext}>
                    <GlowCard contentClassName="divide-y divide-slate-50">
                        <div className="px-6 py-5">
                            <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Votre entreprise</p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Secteur d'activité" required error={errors.sector} className="sm:col-span-2">
                                    <SelectInput
                                        value={data.sector}
                                        onChange={(e) => setData('sector', e.target.value)}
                                        required
                                        error={errors.sector}
                                    >
                                        <option value="">— Choisir —</option>
                                        {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </SelectInput>
                                </Field>

                                <Field label="Ville" required error={errors.city}>
                                    <TextInput
                                        icon={MapPin}
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        placeholder="Yaoundé, Douala…"
                                        required
                                        error={errors.city}
                                    />
                                </Field>

                                <Field label="Adresse" hint="optionnelle" error={errors.address}>
                                    <TextInput
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        placeholder="Quartier, rue, bâtiment…"
                                    />
                                </Field>

                                <Field label="Téléphone entreprise" hint="optionnel" error={errors.phone} className="sm:col-span-2">
                                    <TextInput
                                        icon={Phone}
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="+237 6XX XXX XXX"
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="px-6 py-4">
                            <FormActions>
                                <ActionButton type="submit">
                                    Continuer vers les documents
                                </ActionButton>
                            </FormActions>
                        </div>
                    </GlowCard>
                </form>
            </div>

            {/* Step 2 — Documents */}
            <div hidden={step !== 1}>
                <form onSubmit={submit}>
                    <GlowCard contentClassName="divide-y divide-slate-50">
                        <div className="px-6 py-5">
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Documents requis</p>
                            <p className="mb-5 text-xs text-slate-500 leading-relaxed">
                                Ces pièces permettent de vérifier l'identité du gérant et la légalité de l'entreprise.
                                Elles sont conservées de façon confidentielle et ne seront jamais partagées.
                            </p>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <FilePicker
                                    label="Logo de l'entreprise"
                                    name="logo"
                                    accept="image/jpeg,image/png,image/webp"
                                    hint="optionnel · max 3 Mo"
                                    maxMb={3}
                                    keepPng
                                    value={data.logo}
                                    onChange={(f) => { setData('logo', f); clearErrors('logo'); }}
                                    error={errors.logo}
                                />

                                <div className="sm:col-span-2">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FilePicker
                                            label="Pièce d'identité — recto"
                                            name="id_card_front"
                                            required
                                            accept="image/jpeg,image/png,application/pdf"
                                            hint="CNI · Passeport · Permis"
                                            value={data.id_card_front}
                                            onChange={(f) => { setData('id_card_front', f); clearErrors('id_card_front'); }}
                                            error={errors.id_card_front}
                                        />
                                        <FilePicker
                                            label="Pièce d'identité — verso"
                                            name="id_card_back"
                                            required
                                            accept="image/jpeg,image/png,application/pdf"
                                            value={data.id_card_back}
                                            onChange={(f) => { setData('id_card_back', f); clearErrors('id_card_back'); }}
                                            error={errors.id_card_back}
                                        />
                                    </div>
                                </div>

                                <FilePicker
                                    label="Document légal de l'entreprise"
                                    name="registration_doc"
                                    required
                                    accept="image/jpeg,image/png,application/pdf"
                                    hint="RCCM · Statuts · Patente"
                                    maxMb={10}
                                    value={data.registration_doc}
                                    onChange={(f) => { setData('registration_doc', f); clearErrors('registration_doc'); }}
                                    error={errors.registration_doc}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4">
                            <FormActions>
                                <button
                                    type="button"
                                    onClick={() => setStep(0)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 h-10 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Retour
                                </button>
                                <ActionButton type="submit" loading={processing}>
                                    Soumettre ma demande
                                </ActionButton>
                            </FormActions>
                        </div>
                    </GlowCard>
                </form>
            </div>
        </div>
    );
}

// ── Pending state (submitted, waiting for admin) ───────────────────────────

function PendingView({ company, submittedAt }: { company: Company; submittedAt: string | null }) {
    return (
        <div className="flex flex-col gap-5">
            <GlowCard contentClassName="p-6">
                <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-motriks-soft ring-1 ring-motriks/20">
                            <CheckCircle2 className="size-6 text-motriks" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-100 ring-2 ring-white">
                            <Clock className="size-3 text-amber-500" />
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-ink">Dossier soumis — en cours d'examen</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Votre dossier a été transmis à notre équipe.
                            Vous serez notifié par e-mail dès que votre espace sera activé.
                        </p>
                        {submittedAt && (
                            <p className="mt-2 text-xs text-slate-400">Soumis le {submittedAt}</p>
                        )}
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 text-center">
                    {[
                        { icon: CheckCircle2, color: 'text-motriks', label: 'Dossier reçu', done: true },
                        { icon: Clock, color: 'text-amber-500', label: 'Examen (24–48h)', done: false },
                        { icon: CheckCircle2, color: 'text-slate-300', label: 'Activation', done: false },
                    ].map(({ icon: Icon, color, label, done }) => (
                        <div key={label} className="flex flex-col items-center gap-1.5 py-4">
                            <Icon className={cn('size-4', color, !done && 'opacity-50')} />
                            <span className={cn('text-[11px] font-semibold', done ? 'text-ink' : 'text-slate-400')}>{label}</span>
                        </div>
                    ))}
                </div>
            </GlowCard>

            {/* Submitted info recap */}
            <GlowCard contentClassName="divide-y divide-slate-50">
                <div className="px-6 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Informations soumises</p>
                </div>
                <dl className="grid gap-0 divide-y divide-slate-50">
                    {[
                        { label: 'Entreprise', value: company.name },
                        { label: 'Secteur', value: company.sector },
                        { label: 'Ville', value: company.city },
                        { label: 'Adresse', value: company.address },
                        { label: 'Email', value: company.email },
                        { label: 'Téléphone', value: company.phone },
                    ].filter(({ value }) => value).map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between px-6 py-3">
                            <dt className="text-sm text-slate-500">{label}</dt>
                            <dd className="text-sm font-semibold text-ink">{value}</dd>
                        </div>
                    ))}
                </dl>
            </GlowCard>

            <div className="flex justify-end">
                <Link
                    href={logout().url}
                    method="post"
                    as="button"
                    className="text-sm text-slate-400 transition hover:text-slate-600"
                >
                    Se déconnecter
                </Link>
            </div>
        </div>
    );
}

// ── Rejected state ─────────────────────────────────────────────────────────

function RejectedView({ company, sectors }: Pick<Props, 'company' | 'sectors'>) {
    const [resubmit, setResubmit] = useState(false);

    if (resubmit) {
        return <OnboardingForm company={{ ...company, onboarding_completed: false }} sectors={sectors} />;
    }

    return (
        <div className="flex flex-col gap-5">
            <GlowCard contentClassName="p-6">
                <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 ring-1 ring-red-200">
                        <AlertCircle className="size-6 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-ink">Dossier non approuvé</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Votre dossier n'a pas pu être validé en l'état.
                            Corrigez les points ci-dessous et soumettez un nouveau dossier.
                        </p>
                    </div>
                </div>

                {company.rejection_reason && (
                    <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-400">Motif du refus</p>
                        <p className="text-sm leading-relaxed text-red-700">{company.rejection_reason}</p>
                    </div>
                )}
            </GlowCard>

            <div className="flex items-center gap-3">
                <ActionButton icon={<RefreshCw />} onClick={() => setResubmit(true)}>
                    Soumettre un nouveau dossier
                </ActionButton>
                <Link
                    href={logout().url}
                    method="post"
                    as="button"
                    className="text-sm text-slate-400 transition hover:text-slate-600"
                >
                    Se déconnecter
                </Link>
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────

const FROZEN_TABS = [
    { icon: Users,    label: 'Équipe' },
    { icon: MapPin,   label: 'Points de vente' },
    { icon: Settings, label: 'Paramètres' },
];

export default function OnboardingPage({ company, user, sectors }: Props) {
    const isPending  = company.status === 'pending';
    const isRejected = company.status === 'rejected';
    const hasSubmitted = company.onboarding_completed;

    const pageTitle  = isPending && !hasSubmitted ? 'Finalisez votre inscription' : 'Profil de l\'entreprise';
    const pageDescr  = isPending && !hasSubmitted
        ? 'Complétez votre dossier pour activer votre espace Motriks.'
        : company.name;

    return (
        <>
            <Head title={pageTitle} />
            <GlowStyles />

            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
                {/* ── Page header ── */}
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                            <Building2 className="size-3.5" />
                            Espace entreprise
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{company.name}</h1>
                        <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
                    </div>

                    {/* Status badge */}
                    {isPending && !hasSubmitted && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                            <Clock className="size-3" /> En cours d'inscription
                        </span>
                    )}
                    {isPending && hasSubmitted && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                            <Clock className="size-3" /> En attente de validation
                        </span>
                    )}
                    {isRejected && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
                            <AlertCircle className="size-3" /> Dossier rejeté
                        </span>
                    )}
                </div>

                {/* ── Tab bar ── */}
                <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                    {/* Active tab: Profil */}
                    <button
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-sm"
                        aria-current="page"
                    >
                        <Building2 className="size-4 text-motriks" />
                        Profil
                    </button>

                    {/* Frozen tabs */}
                    {FROZEN_TABS.map((t) => (
                        <FrozenTab key={t.label} icon={t.icon} label={t.label} />
                    ))}
                </div>

                {/* ── Tab content ── */}
                {isPending && !hasSubmitted && (
                    <OnboardingForm company={company} sectors={sectors} />
                )}
                {isPending && hasSubmitted && (
                    <PendingView company={company} submittedAt={company.onboarding_completed_at} />
                )}
                {isRejected && (
                    <RejectedView company={company} sectors={sectors} />
                )}
            </div>
        </>
    );
}
