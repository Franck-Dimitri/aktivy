import { useForm } from '@inertiajs/react';
import { Building2, Mail, MapPin, Phone, Send, User } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { store as companyStore } from '@/routes/admin/companies';

/** Petit intertitre de section, à l'intérieur du formulaire. */
function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2.5">
                <span className="flex size-5 shrink-0 translate-y-[-1px] items-center justify-center rounded-full bg-motriks-soft text-[11px] font-bold text-motriks-deep tabular-nums">
                    {step}
                </span>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">{title}</h3>
                    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

/**
 * Création directe d'une entreprise par le super administrateur, sans dossier d'inscription :
 * active tout de suite, avec l'essai de Motriks Business ; le gérant reçoit une invitation par e-mail.
 * À monter seulement quand il est ouvert ({open && <CreateCompanyModal …/>}) : le formulaire repart vide.
 * Après création, le serveur redirige vers la fiche de l'entreprise.
 */
export function CreateCompanyModal({ sectors, onClose }: { sectors: string[]; onClose: () => void }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        sector: '',
        city: '',
        address: '',
        phone: '',
        manager_name: '',
        manager_email: '',
        manager_phone: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(companyStore().url, { preserveScroll: true, onError: toastFormError });
    };

    return (
        <Modal
            onClose={() => !processing && onClose()}
            title="Créer une entreprise"
            description="Active tout de suite, avec 7 jours d’essai de Motriks Business. Le gérant reçoit une invitation pour choisir son mot de passe."
            size="lg"
            icon={<Building2 />}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
                <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 pt-4 pb-6">
                    <Section step={1} title="L’entreprise">
                        <Field label="Nom de l’entreprise" htmlFor="cc-name" required error={errors.name}>
                            <TextInput
                                id="cc-name"
                                icon={Building2}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                autoComplete="organization"
                                autoFocus
                            />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Secteur" htmlFor="cc-sector" error={errors.sector}>
                                <SelectInput
                                    id="cc-sector"
                                    value={data.sector}
                                    onChange={(e) => setData('sector', e.target.value)}
                                    error={errors.sector}
                                >
                                    <option value="">Non précisé</option>
                                    {sectors.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>
                            <Field label="Ville" htmlFor="cc-city" error={errors.city}>
                                <TextInput
                                    id="cc-city"
                                    icon={MapPin}
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    error={errors.city}
                                    placeholder="Yaoundé"
                                />
                            </Field>
                            <Field label="Adresse" htmlFor="cc-address" error={errors.address}>
                                <TextInput
                                    id="cc-address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    error={errors.address}
                                    autoComplete="street-address"
                                />
                            </Field>
                            <Field label="Téléphone" htmlFor="cc-phone" error={errors.phone}>
                                <TextInput
                                    id="cc-phone"
                                    type="tel"
                                    icon={Phone}
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    error={errors.phone}
                                />
                            </Field>
                        </div>
                    </Section>

                    <div className="h-px bg-slate-100 dark:bg-sidebar-border" />

                    <Section step={2} title="Le gérant" hint="L’invitation part à cette adresse ; le lien est valable 7 jours.">
                        <Field label="Nom complet" htmlFor="cc-manager-name" required error={errors.manager_name}>
                            <TextInput
                                id="cc-manager-name"
                                icon={User}
                                value={data.manager_name}
                                onChange={(e) => setData('manager_name', e.target.value)}
                                error={errors.manager_name}
                                autoComplete="name"
                            />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="E-mail" htmlFor="cc-manager-email" required error={errors.manager_email}>
                                <TextInput
                                    id="cc-manager-email"
                                    type="email"
                                    icon={Mail}
                                    value={data.manager_email}
                                    onChange={(e) => setData('manager_email', e.target.value)}
                                    error={errors.manager_email}
                                    autoComplete="email"
                                />
                            </Field>
                            <Field label="Téléphone" htmlFor="cc-manager-phone" hint="facultatif" error={errors.manager_phone}>
                                <TextInput
                                    id="cc-manager-phone"
                                    type="tel"
                                    icon={Phone}
                                    value={data.manager_phone}
                                    onChange={(e) => setData('manager_phone', e.target.value)}
                                    error={errors.manager_phone}
                                    autoComplete="tel"
                                />
                            </Field>
                        </div>
                    </Section>
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-sidebar-border dark:bg-white/[0.02]">
                    <button type="button" onClick={onClose} disabled={processing} className={buttonClass('secondary', 'md')}>
                        Annuler
                    </button>
                    <ActionButton type="submit" icon={<Send />} loading={processing}>
                        Créer et envoyer l’invitation
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
