import { Head, useForm } from '@inertiajs/react';
import { Building2, Check, FileText, ImagePlus, Mail, MapPin, Phone, RefreshCw, Trash2, TriangleAlert, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { RemindersPanel, type Reminders } from './reminders-panel';
import { compressImage } from '@/lib/compress-image';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { edit as settingsEdit, update as settingsUpdate } from '@/routes/company/settings';

type Company = {
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    primary_color: string | null;
    logo_url: string | null;
};

/** Doit rester aligné sur Company::DEFAULT_DOCUMENT_COLOR et Company::documentColor() côté serveur. */
const DEFAULT_COLOR = '#027a48';
const LOGO_TYPES = ['image/jpeg', 'image/png'];
const LOGO_MAX_MB = 3;

const PRESETS = [
    { hex: '#027a48', name: 'Émeraude' },
    { hex: '#0f766e', name: 'Sarcelle' },
    { hex: '#1d4ed8', name: 'Bleu roi' },
    { hex: '#1e293b', name: 'Ardoise' },
    { hex: '#6d28d9', name: 'Violet' },
    { hex: '#9f1239', name: 'Bordeaux' },
    { hex: '#c2410c', name: 'Terre cuite' },
];

/** Même calcul que le serveur : au-delà de 0,65 de luminance, les documents repassent en vert. */
function documentColor(hex: string): { color: string; replaced: boolean } {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return { color: DEFAULT_COLOR, replaced: true };
    const [r, g, b] = [m[1], m[2], m[3]].map((v) => parseInt(v, 16));
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65 ? { color: DEFAULT_COLOR, replaced: true } : { color: hex, replaced: false };
}

export default function CompanySettings({ company, reminders, timezone }: { company: Company; reminders: Reminders; timezone: string }) {
    const [removed, setRemoved] = useState(false);
    const form = useForm({
        name: company.name,
        email: company.email ?? '',
        phone: company.phone ?? '',
        city: company.city ?? '',
        address: company.address ?? '',
        primary_color: company.primary_color ?? DEFAULT_COLOR,
        logo: null as File | null,
        remove_logo: false,
    });
    const { data, setData, post, processing, errors, isDirty } = form;

    const logoPreview = useMemo(() => (data.logo ? URL.createObjectURL(data.logo) : null), [data.logo]);
    useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
    const logoShown = logoPreview ?? (removed ? null : company.logo_url);

    const submit = (e?: FormEvent) => {
        e?.preventDefault();
        post(settingsUpdate().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Paramètres enregistrés');
                setRemoved(false);
                form.setDefaults({ ...data, logo: null, remove_logo: false });
                setData((d) => ({ ...d, logo: null, remove_logo: false }));
            },
            onError: toastFormError,
        });
    };

    const cancel = () => {
        form.reset();
        form.clearErrors();
        setRemoved(false);
    };

    return (
        <>
            <Head title="Paramètres de l’entreprise" />

            <Page title="Paramètres de l’entreprise" description="Votre identité et vos coordonnées, reprises dans vos rapports PDF et Excel." className="max-w-6xl">
                <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                        <Section title="Identité" description="Le nom et le logo qui apparaissent en tête de vos documents.">
                            <Row label="Nom de l’entreprise" htmlFor="name" required error={errors.name}>
                                <TextInput id="name" icon={Building2} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required maxLength={255} />
                            </Row>

                            <Row label="Logo" hint={`JPG ou PNG · ${LOGO_MAX_MB} Mo max`} error={errors.logo}>
                                <LogoField
                                    src={logoShown}
                                    fileName={data.logo?.name}
                                    canRestore={removed && !!company.logo_url && !data.logo}
                                    onPick={async (file) => setData('logo', await compressImage(file, { maxSide: 800, keepPng: true }))}
                                    onRemove={() => {
                                        if (data.logo) return setData('logo', null);
                                        setRemoved(true);
                                        setData('remove_logo', true);
                                    }}
                                    onRestore={() => {
                                        setRemoved(false);
                                        setData('remove_logo', false);
                                    }}
                                />
                            </Row>
                        </Section>

                        <Section title="Couleur des documents" description="Titres, filets et en-têtes de tableaux de vos PDF et Excel.">
                            <Row label="Couleur principale" error={errors.primary_color}>
                                <ColorField value={data.primary_color} onChange={(v) => setData('primary_color', v)} />
                            </Row>
                        </Section>

                        <Section title="Coordonnées" description="Affichées en pied de page de vos rapports PDF." last>
                            <Row label="E-mail" htmlFor="email" error={errors.email}>
                                <TextInput id="email" type="email" icon={Mail} placeholder="contact@entreprise.cm" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} maxLength={255} />
                            </Row>
                            <Row label="Téléphone" htmlFor="phone" error={errors.phone}>
                                <TextInput id="phone" type="tel" icon={Phone} placeholder="+237 6XX XX XX XX" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} maxLength={25} />
                            </Row>
                            <Row label="Ville" htmlFor="city" error={errors.city}>
                                <TextInput id="city" icon={MapPin} placeholder="Douala" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} maxLength={100} />
                            </Row>
                            <Row label="Adresse" htmlFor="address" error={errors.address}>
                                <TextInput id="address" placeholder="Rue, quartier" value={data.address} onChange={(e) => setData('address', e.target.value)} error={errors.address} maxLength={255} />
                            </Row>
                        </Section>
                    </div>

                    {/* Aperçu et enregistrement restent visibles pendant la saisie */}
                    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
                        <DocumentPreview
                            name={data.name}
                            logo={logoShown}
                            color={data.primary_color}
                            contact={[data.email, data.phone, [data.address, data.city].filter(Boolean).join(', ')].filter(Boolean)}
                        />
                        <SavePanel dirty={isDirty} processing={processing} onCancel={cancel} />
                    </aside>
                </form>

                <RemindersPanel initial={reminders} timezone={timezone} />
            </Page>
        </>
    );
}

/* ───────────────────────── Mise en page ───────────────────────── */

function Section({ title, description, last, children }: { title: string; description: string; last?: boolean; children: ReactNode }) {
    return (
        <section className={cn('px-5 py-6 sm:px-7 sm:py-7', !last && 'border-b border-slate-100 dark:border-sidebar-border')}>
            <header className="mb-5">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            </header>
            <div className="flex flex-col gap-5">{children}</div>
        </section>
    );
}

function Row({ label, htmlFor, hint, required, error, children }: { label: string; htmlFor?: string; hint?: string; required?: boolean; error?: string; children: ReactNode }) {
    return (
        <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
            <div className="sm:pt-3">
                <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
                    {label}
                    {required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
            </div>
            <div className="min-w-0">
                {children}
                {error && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ───────────────────────── Logo ───────────────────────── */

function LogoField({
    src,
    fileName,
    canRestore,
    onPick,
    onRemove,
    onRestore,
}: {
    src: string | null;
    fileName?: string;
    canRestore: boolean;
    onPick: (file: File) => void;
    onRemove: () => void;
    onRestore: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const pick = (file?: File | null) => {
        if (!file) return;
        if (!LOGO_TYPES.includes(file.type)) {
            toast.error('Format non supporté', { description: 'Le logo doit être une image JPG ou PNG.' });
            return;
        }
        if (file.size > LOGO_MAX_MB * 1024 * 1024) {
            toast.error('Image trop lourde', { description: `La taille maximale est de ${LOGO_MAX_MB} Mo.` });
            return;
        }
        onPick(file);
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
            className={cn(
                'flex items-center gap-4 rounded-xl border border-dashed p-3 transition-colors',
                dragging ? 'border-motriks bg-motriks-soft' : 'border-slate-200 dark:border-sidebar-border',
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={LOGO_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label={src ? 'Changer le logo' : 'Ajouter un logo'}
                className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:12px_12px] ring-1 ring-slate-200 transition hover:ring-motriks focus-visible:ring-4 focus-visible:ring-motriks/20 focus-visible:outline-none"
            >
                {src ? (
                    <img src={src} alt="Logo de l’entreprise" className="size-full object-contain p-2" />
                ) : (
                    <ImagePlus className="size-6 text-slate-400 transition-colors group-hover:text-motriks" />
                )}
            </button>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{fileName ?? (src ? 'Logo actuel' : 'Aucun logo')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                    {src ? 'Fond transparent conseillé (PNG).' : 'Glissez une image ici ou cliquez pour choisir.'}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                    <ActionButton variant="secondary" size="sm" icon={src ? <RefreshCw /> : <ImagePlus />} onClick={() => inputRef.current?.click()}>
                        {src ? 'Changer' : 'Choisir un fichier'}
                    </ActionButton>
                    {src && (
                        <ActionButton variant="icon-danger" size="sm" icon={<Trash2 />} onClick={onRemove}>
                            Retirer
                        </ActionButton>
                    )}
                    {canRestore && (
                        <ActionButton variant="ghost" size="sm" icon={<Undo2 />} onClick={onRestore}>
                            Restaurer
                        </ActionButton>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────── Couleur ───────────────────────── */

function ColorField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);

    const { replaced } = documentColor(value);
    const isPreset = PRESETS.some((p) => p.hex.toLowerCase() === value.toLowerCase());

    const commit = (raw: string) => {
        const hex = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase();
        if (/^#[0-9a-f]{6}$/.test(hex)) onChange(hex);
        else setDraft(value);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Couleurs proposées">
                {PRESETS.map((p) => {
                    const active = p.hex.toLowerCase() === value.toLowerCase();
                    return (
                        <button
                            key={p.hex}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            title={p.name}
                            onClick={() => onChange(p.hex)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:ring-offset-card',
                                active ? 'ring-2 ring-slate-900/80 dark:ring-white/80' : 'hover:scale-110',
                            )}
                            style={{ backgroundColor: p.hex }}
                        >
                            {active && <Check className="size-4 text-white" strokeWidth={3} />}
                        </button>
                    );
                })}

                <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-sidebar-border" aria-hidden />

                <label
                    title="Couleur personnalisée"
                    className={cn(
                        'relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#ef4444)] ring-offset-2 transition dark:ring-offset-card',
                        !isPreset ? 'ring-2 ring-slate-900/80 dark:ring-white/80' : 'hover:scale-110',
                    )}
                >
                    {!isPreset && <span className="size-4 rounded-full ring-2 ring-white" style={{ backgroundColor: value }} />}
                    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Couleur personnalisée" />
                </label>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative w-36">
                    <span className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 rounded-md ring-1 ring-black/10" style={{ backgroundColor: value }} />
                    <input
                        value={draft.toUpperCase()}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={(e) => commit(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commit(e.currentTarget.value);
                            }
                        }}
                        maxLength={7}
                        spellCheck={false}
                        aria-label="Code hexadécimal"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 font-mono text-[13px] text-ink uppercase outline-none transition-[border-color,box-shadow] hover:border-slate-300 focus:border-motriks focus:ring-4 focus:ring-motriks/10 dark:border-sidebar-border dark:bg-transparent"
                    />
                </div>
                {value.toLowerCase() !== DEFAULT_COLOR && (
                    <button type="button" onClick={() => onChange(DEFAULT_COLOR)} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5">
                        Réinitialiser
                    </button>
                )}
            </div>

            {replaced && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                    Cette couleur est trop claire pour rester lisible : vos documents utiliseront le vert Motriks à la place.
                </p>
            )}
        </div>
    );
}

/* ───────────────────────── Aperçu ───────────────────────── */

const SAMPLE_LINES = [
    { product: 'Jus de mangue 33 cl', price: 500, sold: 48 },
    { product: 'Eau minérale 1,5 L', price: 500, sold: 36 },
    { product: 'Biscuits chocolat', price: 500, sold: 22 },
];

const fcfa = (n: number) => `${n.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;

/**
 * Miniature d'une page A4 du rapport journalier, calquée sur resources/views/pdf/layout.blade.php :
 * en-tête filet de couleur, titres et libellés en couleur, tableau sobre, pied de page avec coordonnées.
 */
function DocumentPreview({ name, logo, color, contact }: { name: string; logo: string | null; color: string; contact: string[] }) {
    const doc = documentColor(color).color;
    const company = name.trim() || 'Votre entreprise';
    const now = new Date();
    const day = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const edited = `${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const total = SAMPLE_LINES.reduce((s, l) => s + l.price * l.sold, 0);
    const units = SAMPLE_LINES.reduce((s, l) => s + l.sold, 0);

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    <FileText className="size-3.5" />
                    Aperçu du PDF
                </p>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:bg-white/5">A4</span>
            </div>

            {/* Le « bureau » sous la feuille */}
            <div className="rounded-2xl bg-slate-100/80 p-4 ring-1 ring-slate-200/60 dark:bg-white/[0.03] dark:ring-sidebar-border">
                <div
                    className="theme-light relative mx-auto flex aspect-[1/1.414] w-full flex-col overflow-hidden rounded-[3px] bg-white px-[7%] pt-[6%] pb-[4%] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-8px_rgba(15,23,42,0.18)]"
                    aria-label="Aperçu d’un rapport PDF"
                >
                    {/* En-tête */}
                    <header className="flex items-center gap-2.5 border-b-2 pb-2.5" style={{ borderColor: doc }}>
                        {logo ? (
                            <img src={logo} alt="" className="h-7 max-w-[72px] shrink-0 object-contain object-left" />
                        ) : (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-bold text-white" style={{ backgroundColor: doc }}>
                                {company[0].toUpperCase()}
                            </span>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] leading-tight font-bold" style={{ color: doc }}>
                                {company}
                            </p>
                            <p className="truncate text-[7px] text-slate-500">Carrefour Bonamoussadi · Douala</p>
                        </div>
                        <div className="shrink-0 text-right text-[6.5px] leading-snug text-slate-500">
                            Rapport journalier
                            <br />
                            Édité le {edited}
                        </div>
                    </header>

                    {/* Titre */}
                    <h3 className="mt-4 text-[12px] leading-tight font-bold first-letter:uppercase">Rapport du {day}</h3>
                    <p className="mt-0.5 text-[7px] text-slate-500">Awa Mbarga · Carrefour Bonamoussadi, Douala</p>
                    <span className="mt-1.5 inline-flex w-fit rounded-full bg-[#d1fadf] px-1.5 py-px text-[6.5px] font-bold text-[#05603a]">Validé le {now.toLocaleDateString('fr-FR')}</span>

                    {/* Chiffres clés */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                        {[
                            ['Chiffre d’affaires', fcfa(total)],
                            ['Unités vendues', String(units)],
                            ['Arrivée / départ', '08:02 – 17:45'],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-[3px] bg-slate-100 px-1.5 py-1.5">
                                <p className="truncate text-[6px]" style={{ color: doc }}>
                                    {label}
                                </p>
                                <p className="mt-px truncate text-[9px] font-bold tabular-nums">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tableau */}
                    <p className="mt-4 mb-1 text-[9px] font-bold" style={{ color: doc }}>
                        Ventes par produit
                    </p>
                    <table className="w-full border-collapse text-[7px] tabular-nums">
                        <thead>
                            <tr className="border-b border-slate-300 text-left text-[6.5px] text-slate-500">
                                <th className="py-1 font-semibold">Produit</th>
                                <th className="py-1 text-right font-semibold">Prix</th>
                                <th className="py-1 text-right font-semibold">Vendus</th>
                                <th className="py-1 text-right font-semibold">CA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SAMPLE_LINES.map((l) => (
                                <tr key={l.product} className="border-b border-slate-200">
                                    <td className="max-w-0 truncate py-1 pr-1">{l.product}</td>
                                    <td className="py-1 text-right whitespace-nowrap text-slate-600">{l.price}</td>
                                    <td className="py-1 text-right font-bold">{l.sold}</td>
                                    <td className="py-1 text-right whitespace-nowrap">{fcfa(l.price * l.sold)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-[1.5px] border-slate-900 font-bold">
                                <td className="py-1">Total</td>
                                <td />
                                <td className="py-1 text-right">{units}</td>
                                <td className="py-1 text-right whitespace-nowrap">{fcfa(total)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Lignes fantômes : la suite du document */}
                    <div aria-hidden className="mt-4 space-y-1.5">
                        <div className="h-1 w-1/3 rounded-full" style={{ backgroundColor: doc, opacity: 0.35 }} />
                        <div className="h-1 w-full rounded-full bg-slate-100" />
                        <div className="h-1 w-5/6 rounded-full bg-slate-100" />
                        <div className="h-1 w-2/3 rounded-full bg-slate-100" />
                    </div>

                    {/* Pied de page */}
                    <footer className="mt-auto pt-3 text-center text-[6px] leading-relaxed text-slate-400">
                        {contact.length > 0 ? (
                            <p className="truncate text-slate-500">
                                {company} · {contact.join(' · ')}
                            </p>
                        ) : (
                            <p className="truncate italic">Vos coordonnées apparaîtront ici</p>
                        )}
                        <p>Document généré par Motriks</p>
                    </footer>
                </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-400">Chiffres fictifs. Seuls votre nom, votre logo, votre couleur et vos coordonnées sont repris de cette page.</p>
        </div>
    );
}

/* ───────────────────────── Enregistrement ───────────────────────── */

function SavePanel({ dirty, processing, onCancel }: { dirty: boolean; processing: boolean; onCancel: () => void }) {
    return (
        <div
            className={cn(
                'rounded-2xl border p-4 transition-colors duration-200',
                dirty ? 'border-amber-200/80 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]' : 'border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card',
            )}
        >
            <p className="flex items-center gap-2 text-sm font-medium text-ink" role="status">
                {dirty ? (
                    <span className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60 motion-reduce:animate-none" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                    </span>
                ) : (
                    <Check className="size-4 shrink-0 text-motriks" />
                )}
                {dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {dirty ? 'Vos prochains PDF et exports Excel utiliseront ces réglages dès l’enregistrement.' : 'Vos documents utilisent ces réglages.'}
            </p>
            <div className="mt-3.5 flex gap-2">
                {dirty && (
                    <ActionButton variant="secondary" onClick={onCancel} disabled={processing} className="flex-1">
                        Annuler
                    </ActionButton>
                )}
                <ActionButton type="submit" icon={<Check />} loading={processing} disabled={!dirty} className="flex-1">
                    Enregistrer
                </ActionButton>
            </div>
        </div>
    );
}

CompanySettings.layout = {
    breadcrumbs: [{ title: 'Paramètres', href: settingsEdit().url }],
};
