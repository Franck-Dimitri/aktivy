import { Head, useForm } from '@inertiajs/react';
import { Building2, ChevronLeft, ChevronRight, FileText, MapPin, Phone, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { AuthPrimaryButton } from '@/components/auth/auth-field';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store as onboardingStore } from '@/routes/onboarding';

type Props = {
    company: { name: string; email: string | null; phone: string | null; sector: string | null; city: string | null; address: string | null };
    sectors: string[];
};

const STEPS = ['Votre entreprise', 'Documents'];

type FileField = 'logo' | 'id_card_front' | 'id_card_back' | 'registration_doc';

function FilePicker({
    label,
    name,
    required,
    accept,
    error,
    value,
    onChange,
    hint,
}: {
    label: string;
    name: string;
    required?: boolean;
    accept: string;
    error?: string;
    value: File | null;
    onChange: (f: File | null) => void;
    hint?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const preview = value && value.type.startsWith('image/') ? URL.createObjectURL(value) : null;

    return (
        <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">
                {label}{required && <span className="ml-1 text-red-500">*</span>}
                {hint && <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>}
            </p>
            <input ref={ref} type="file" name={name} accept={accept} className="hidden"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)} />

            {value ? (
                <div className="flex items-center gap-3 rounded-xl border border-aktivy bg-aktivy-soft px-4 py-3">
                    {preview ? (
                        <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-aktivy/20" />
                    ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg bg-white ring-1 ring-aktivy/20">
                            <FileText className="size-5 text-aktivy" />
                        </div>
                    )}
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-aktivy-deep">{value.name}</p>
                    <button type="button" onClick={() => { onChange(null); if (ref.current) ref.current.value = ''; }}
                        className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-red-500 transition">
                        <X className="size-4" />
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => ref.current?.click()}
                    className={cn(
                        'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition hover:border-aktivy hover:bg-aktivy-soft',
                        error ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/50',
                    )}>
                    <UploadCloud className={cn('size-6', error ? 'text-red-400' : 'text-slate-300')} />
                    <p className="text-xs font-medium text-slate-500">Cliquer pour choisir un fichier</p>
                    <p className="text-[11px] text-slate-400">JPG, PNG ou PDF</p>
                </button>
            )}
            {error && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
}

export default function Onboarding({ company, sectors }: Props) {
    const [step, setStep] = useState(0);

    const { data, setData, post, processing, errors } = useForm<{
        sector: string;
        city: string;
        address: string;
        phone: string;
        logo: File | null;
        id_card_front: File | null;
        id_card_back: File | null;
        registration_doc: File | null;
    }>({
        sector:           company.sector ?? '',
        city:             company.city ?? '',
        address:          company.address ?? '',
        phone:            company.phone ?? '',
        logo:             null,
        id_card_front:    null,
        id_card_back:     null,
        registration_doc: null,
    });

    function goNext(e: React.FormEvent) {
        e.preventDefault();
        if (!data.sector || !data.city) return;
        setStep(1);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(onboardingStore().url, { forceFormData: true });
    }

    return (
        <>
            <Head title="Finaliser votre inscription" />

            {/* Progress */}
            <ol className="mb-8 grid grid-cols-2 gap-2" aria-label="Étapes">
                {STEPS.map((label, i) => (
                    <li key={label} aria-current={i === step ? 'step' : undefined} className="grid gap-2">
                        <span className={cn('h-1 rounded-full transition-colors', i <= step ? 'bg-aktivy' : 'bg-slate-200')} />
                        <span className={cn('text-xs font-semibold', i === step ? 'text-ink' : 'text-slate-400')}>
                            {i + 1}. {label}
                        </span>
                    </li>
                ))}
            </ol>

            {/* Recap banner */}
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Building2 className="size-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">Espace de</p>
                    <p className="truncate text-sm font-bold text-ink">{company.name}</p>
                </div>
            </div>

            {/* ── Step 1 : Company details ── */}
            <form hidden={step !== 0} onSubmit={goNext} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-ink">Secteur d'activité <span className="text-red-500">*</span></label>
                    <select
                        value={data.sector}
                        onChange={(e) => setData('sector', e.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-aktivy focus:ring-4 focus:ring-aktivy/10"
                    >
                        <option value="">-- Choisir --</option>
                        {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.sector && <p className="text-xs font-medium text-red-600">{errors.sector}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-ink">Ville <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" value={data.city} required placeholder="Yaoundé, Douala…"
                            onChange={(e) => setData('city', e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-aktivy focus:ring-4 focus:ring-aktivy/10"
                        />
                    </div>
                    {errors.city && <p className="text-xs font-medium text-red-600">{errors.city}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-ink">
                        Adresse
                        <span className="ml-1.5 text-xs font-normal text-slate-400">optionnelle</span>
                    </label>
                    <input
                        type="text" value={data.address} placeholder="Rue, quartier, immeuble…"
                        onChange={(e) => setData('address', e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-aktivy focus:ring-4 focus:ring-aktivy/10"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-ink">
                        Téléphone entreprise
                        <span className="ml-1.5 text-xs font-normal text-slate-400">optionnel</span>
                    </label>
                    <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="tel" value={data.phone} placeholder="+237 6XX XXX XXX"
                            onChange={(e) => setData('phone', e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-aktivy focus:ring-4 focus:ring-aktivy/10"
                        />
                    </div>
                </div>

                <AuthPrimaryButton type="submit" className="mt-1">
                    Continuer <ChevronRight className="size-4" />
                </AuthPrimaryButton>
            </form>

            {/* ── Step 2 : Documents ── */}
            <form hidden={step !== 1} onSubmit={submit} className="flex flex-col gap-5">
                <p className="text-xs text-slate-500">
                    Ces documents permettent de vérifier l'identité du gérant et la légalité de l'entreprise.
                    Ils sont conservés de façon confidentielle.
                </p>

                <FilePicker
                    label="Logo de l'entreprise"
                    name="logo"
                    accept="image/jpeg,image/png,image/webp"
                    hint="optionnel — JPG ou PNG, max 3 Mo"
                    value={data.logo}
                    onChange={(f) => setData('logo', f)}
                    error={errors.logo}
                />

                <FilePicker
                    label="Pièce d'identité (recto)"
                    name="id_card_front"
                    required
                    accept="image/jpeg,image/png,application/pdf"
                    hint="CNI, passeport ou permis"
                    value={data.id_card_front}
                    onChange={(f) => setData('id_card_front', f)}
                    error={errors.id_card_front}
                />

                <FilePicker
                    label="Pièce d'identité (verso)"
                    name="id_card_back"
                    required
                    accept="image/jpeg,image/png,application/pdf"
                    value={data.id_card_back}
                    onChange={(f) => setData('id_card_back', f)}
                    error={errors.id_card_back}
                />

                <FilePicker
                    label="Registre de commerce / Document légal"
                    name="registration_doc"
                    required
                    accept="image/jpeg,image/png,application/pdf"
                    hint="RCCM, statuts, etc."
                    value={data.registration_doc}
                    onChange={(f) => setData('registration_doc', f)}
                    error={errors.registration_doc}
                />

                <div className="flex gap-3 pt-1">
                    <button
                        type="button" onClick={() => setStep(0)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <ChevronLeft className="size-4" /> Retour
                    </button>
                    <AuthPrimaryButton type="submit" className="flex-1" disabled={processing}>
                        {processing && <Spinner />}
                        Soumettre ma demande
                    </AuthPrimaryButton>
                </div>
            </form>
        </>
    );
}

Onboarding.layout = {
    title: 'Finalisez votre inscription',
    description: 'Quelques informations sur votre entreprise et les pièces justificatives.',
    showcase: 'register',
};
