import { Head, useForm } from '@inertiajs/react';
import { Building2, Clock, FileText, MapPin, Phone, Store, Tag, User } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as sitesIndex, store as siteStore, create as siteCreate } from '@/routes/sites';
import type { SiteTypeOption } from '@/types';

type Props = {
    types: SiteTypeOption[];
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="grid gap-6 py-8 first:pt-0 last:pb-0 lg:grid-cols-[240px_1fr] lg:gap-12">
            <div>
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">{children}</div>
        </section>
    );
}

export default function SiteCreate({ types }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        type: 'autre' as string,
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(siteStore().url, {
            preserveScroll: true,
            onSuccess: () => toast.success('Site créé', { description: `« ${data.name} » a été ajouté à votre réseau.` }),
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title="Nouveau site" />

            <Page title="Nouveau site" description="Ajoutez un point de vente à votre réseau.">
                <form onSubmit={submit} className="max-w-4xl rounded-2xl border border-slate-200/70 bg-white">
                    <div className="divide-y divide-slate-100 px-6 py-6 sm:px-8 sm:py-8">
                        <Section title="Identité du site" description="Le nom et le type de commerce.">
                            <Field label="Nom du site" htmlFor="name" required error={errors.name} className="sm:col-span-2">
                                <TextInput id="name" icon={Store} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ex. : Santa Lucia Ngousso" error={errors.name} required autoFocus />
                            </Field>

                            <Field label="Code interne" htmlFor="code" hint="(optionnel)" error={errors.code}>
                                <TextInput id="code" icon={Tag} value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="Ex. : SL-NGO-01" maxLength={30} error={errors.code} className="font-mono" />
                            </Field>

                            <Field label="Type de commerce" htmlFor="type" required error={errors.type}>
                                <SelectInput id="type" value={data.type} onChange={(e) => setData('type', e.target.value)} error={errors.type}>
                                    {types.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </Section>

                        <Section title="Localisation" description="Où se trouve le point de vente.">
                            <Field label="Adresse" htmlFor="address" error={errors.address} className="sm:col-span-2">
                                <TextArea id="address" icon={Building2} rows={2} value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Rue, quartier, repère…" error={errors.address} />
                            </Field>

                            <Field label="Ville" htmlFor="city" required error={errors.city}>
                                <TextInput id="city" icon={MapPin} value={data.city} onChange={(e) => setData('city', e.target.value)} placeholder="Yaoundé" error={errors.city} required />
                            </Field>

                            <Field label="Région / Province" htmlFor="region" error={errors.region}>
                                <TextInput id="region" value={data.region} onChange={(e) => setData('region', e.target.value)} placeholder="Ex. : Centre" error={errors.region} />
                            </Field>

                            <Field label="Latitude GPS" htmlFor="latitude" hint="(optionnel)" error={errors.latitude}>
                                <TextInput id="latitude" type="number" step="any" value={data.latitude} onChange={(e) => setData('latitude', e.target.value)} placeholder="3.8721" error={errors.latitude} className="font-mono" />
                            </Field>

                            <Field label="Longitude GPS" htmlFor="longitude" hint="(optionnel)" error={errors.longitude}>
                                <TextInput id="longitude" type="number" step="any" value={data.longitude} onChange={(e) => setData('longitude', e.target.value)} placeholder="11.5174" error={errors.longitude} className="font-mono" />
                            </Field>
                        </Section>

                        <Section title="Contact sur place" description="La personne à joindre au point de vente.">
                            <Field label="Responsable" htmlFor="contact_name" error={errors.contact_name}>
                                <TextInput id="contact_name" icon={User} value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} placeholder="Nom du responsable de rayon" error={errors.contact_name} />
                            </Field>

                            <Field label="Téléphone" htmlFor="contact_phone" error={errors.contact_phone}>
                                <TextInput id="contact_phone" type="tel" icon={Phone} value={data.contact_phone} onChange={(e) => setData('contact_phone', e.target.value)} placeholder="+237 6XX XXX XXX" error={errors.contact_phone} />
                            </Field>
                        </Section>

                        <Section title="Horaires d'ouverture">
                            <Field label="Ouverture" htmlFor="opening_time" error={errors.opening_time}>
                                <TextInput id="opening_time" type="time" icon={Clock} value={data.opening_time} onChange={(e) => setData('opening_time', e.target.value)} error={errors.opening_time} />
                            </Field>

                            <Field label="Fermeture" htmlFor="closing_time" error={errors.closing_time}>
                                <TextInput id="closing_time" type="time" icon={Clock} value={data.closing_time} onChange={(e) => setData('closing_time', e.target.value)} error={errors.closing_time} />
                            </Field>
                        </Section>

                        <Section title="Notes internes" description="Visibles uniquement par votre équipe.">
                            <Field label="Notes" htmlFor="notes" hint="(optionnel)" error={errors.notes} className="sm:col-span-2">
                                <TextArea id="notes" icon={FileText} rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Informations utiles : accès, parking, badge d'entrée…" error={errors.notes} />
                            </Field>
                        </Section>
                    </div>

                    <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
                        <ActionLink href={sitesIndex().url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : 'Créer le site'}
                        </ActionButton>
                    </div>
                </form>
            </Page>
        </>
    );
}

SiteCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
        { title: 'Nouveau site', href: siteCreate() },
    ],
};