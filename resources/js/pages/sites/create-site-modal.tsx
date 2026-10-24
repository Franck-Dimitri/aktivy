import { useForm } from '@inertiajs/react';
import { Building2, Clock, FileText, MapPin, Phone, Plus, Store, Tag, User } from 'lucide-react';
import { useCallback, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Field, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { store as siteStore } from '@/routes/sites';
import type { SiteTypeOption } from '@/types';

type Props = {
    types: SiteTypeOption[];
    onClose: () => void;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="grid gap-4">
            <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-3.5 w-0.5 rounded-full bg-motriks" aria-hidden="true" />
                    {title}
                </h4>
                {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">{children}</div>
        </section>
    );
}

/** Modal de création d'un site. À monter uniquement quand il est ouvert. */
export function CreateSiteModal({ types, onClose }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        type: (types.some((t) => t.value === 'autre') ? 'autre' : (types[0]?.value ?? 'autre')) as string,
        address: '',
        city: 'Yaoundé',
        region: '',
        latitude: '',
        longitude: '',
        contact_name: '',
        contact_phone: '',
        opening_time: '',
        closing_time: '',
        notes: '',
    });

    // Pas de fermeture accidentelle pendant l'enregistrement.
    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(siteStore().url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Site créé', { description: `« ${data.name} » a été ajouté à votre réseau.` });
                onClose();
            },
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={close} title="Nouveau site" description="Ajoutez un point de vente à votre réseau." size="lg" icon={<Plus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-8 overflow-y-auto px-6 pt-4 pb-6">
                    <Section title="Identité du site" hint="Le nom et le type de commerce.">
                        <Field label="Nom du site" htmlFor="new-name" required error={errors.name} className="sm:col-span-2">
                            <TextInput
                                id="new-name"
                                icon={Store}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Ex. : Santa Lucia Ngousso"
                                error={errors.name}
                                required
                                autoFocus
                            />
                        </Field>

                        <Field label="Code interne" htmlFor="new-code" hint="(optionnel)" error={errors.code}>
                            <TextInput
                                id="new-code"
                                icon={Tag}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                placeholder="Ex. : SL-NGO-01"
                                maxLength={30}
                                error={errors.code}
                                className="font-mono"
                            />
                        </Field>

                        <Field label="Type de commerce" htmlFor="new-type" required error={errors.type}>
                            <SelectInput id="new-type" value={data.type} onChange={(e) => setData('type', e.target.value)} error={errors.type}>
                                {types.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </SelectInput>
                        </Field>
                    </Section>

                    <Section title="Localisation" hint="Où se trouve le point de vente.">
                        <Field label="Adresse" htmlFor="new-address" error={errors.address} className="sm:col-span-2">
                            <TextArea
                                id="new-address"
                                icon={Building2}
                                rows={2}
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                placeholder="Rue, quartier, repère…"
                                error={errors.address}
                            />
                        </Field>

                        <Field label="Ville" htmlFor="new-city" required error={errors.city}>
                            <TextInput
                                id="new-city"
                                icon={MapPin}
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                placeholder="Yaoundé"
                                error={errors.city}
                                required
                            />
                        </Field>

                        <Field label="Région / Province" htmlFor="new-region" error={errors.region}>
                            <TextInput
                                id="new-region"
                                value={data.region}
                                onChange={(e) => setData('region', e.target.value)}
                                placeholder="Ex. : Centre"
                                error={errors.region}
                            />
                        </Field>

                        <Field label="Latitude GPS" htmlFor="new-latitude" hint="(optionnel)" error={errors.latitude}>
                            <TextInput
                                id="new-latitude"
                                type="number"
                                step="any"
                                value={data.latitude}
                                onChange={(e) => setData('latitude', e.target.value)}
                                placeholder="3.8721"
                                error={errors.latitude}
                                className="font-mono"
                            />
                        </Field>

                        <Field label="Longitude GPS" htmlFor="new-longitude" hint="(optionnel)" error={errors.longitude}>
                            <TextInput
                                id="new-longitude"
                                type="number"
                                step="any"
                                value={data.longitude}
                                onChange={(e) => setData('longitude', e.target.value)}
                                placeholder="11.5174"
                                error={errors.longitude}
                                className="font-mono"
                            />
                        </Field>
                    </Section>

                    <Section title="Contact sur place" hint="La personne à joindre au point de vente.">
                        <Field label="Responsable" htmlFor="new-contact-name" error={errors.contact_name}>
                            <TextInput
                                id="new-contact-name"
                                icon={User}
                                value={data.contact_name}
                                onChange={(e) => setData('contact_name', e.target.value)}
                                placeholder="Nom du responsable de rayon"
                                error={errors.contact_name}
                            />
                        </Field>

                        <Field label="Téléphone" htmlFor="new-contact-phone" error={errors.contact_phone}>
                            <TextInput
                                id="new-contact-phone"
                                type="tel"
                                icon={Phone}
                                value={data.contact_phone}
                                onChange={(e) => setData('contact_phone', e.target.value)}
                                placeholder="+237 6XX XXX XXX"
                                error={errors.contact_phone}
                            />
                        </Field>
                    </Section>

                    <Section title="Horaires d'ouverture">
                        <Field label="Ouverture" htmlFor="new-opening" error={errors.opening_time}>
                            <TextInput
                                id="new-opening"
                                type="time"
                                icon={Clock}
                                value={data.opening_time}
                                onChange={(e) => setData('opening_time', e.target.value)}
                                error={errors.opening_time}
                            />
                        </Field>

                        <Field label="Fermeture" htmlFor="new-closing" error={errors.closing_time}>
                            <TextInput
                                id="new-closing"
                                type="time"
                                icon={Clock}
                                value={data.closing_time}
                                onChange={(e) => setData('closing_time', e.target.value)}
                                error={errors.closing_time}
                            />
                        </Field>
                    </Section>

                    <Section title="Notes internes" hint="Visibles uniquement par votre équipe.">
                        <Field label="Notes" htmlFor="new-notes" hint="(optionnel)" error={errors.notes} className="sm:col-span-2">
                            <TextArea
                                id="new-notes"
                                icon={FileText}
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Informations utiles : accès, parking, badge d'entrée…"
                                error={errors.notes}
                            />
                        </Field>
                    </Section>
                </div>

                <footer className="flex items-center justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Créer le site'}
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
