import { Head, useForm } from '@inertiajs/react';
import { Building2, Clock, FileText, MapPin, Phone, Store, Tag, User } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, FormActions, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as sitesIndex, show as siteShow, update as siteUpdate } from '@/routes/sites';
import type { SiteFormData, SiteStatusOption, SiteTypeOption } from '@/types';

type Props = {
    site: SiteFormData & { id: number };
    types: SiteTypeOption[];
    statuses: SiteStatusOption[];
};

export default function SiteEdit({ site, types, statuses }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: site.name,
        code: site.code ?? '',
        type: site.type,
        address: site.address ?? '',
        city: site.city,
        region: site.region ?? '',
        latitude: site.latitude?.toString() ?? '',
        longitude: site.longitude?.toString() ?? '',
        contact_name: site.contact_name ?? '',
        contact_phone: site.contact_phone ?? '',
        opening_time: site.opening_time ?? '',
        closing_time: site.closing_time ?? '',
        notes: site.notes ?? '',
        status: site.status ?? 'active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(siteUpdate(site.id).url, {
            preserveScroll: true,
            onSuccess: () => toast.success('Site mis à jour', { description: `Les modifications de « ${data.name} » sont enregistrées.` }),
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title={`Modifier — ${site.name}`} />

            <Page title={`Modifier : ${site.name}`}>
                <form onSubmit={submit} className="flex flex-col gap-6">
                    <Panel title="Identité du site">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="Nom du site" htmlFor="name" required error={errors.name} className="sm:col-span-2">
                                <TextInput id="name" icon={Store} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required />
                            </Field>

                            <Field label="Code interne" htmlFor="code" hint="(optionnel)" error={errors.code}>
                                <TextInput id="code" icon={Tag} value={data.code} onChange={(e) => setData('code', e.target.value)} maxLength={30} error={errors.code} className="font-mono" />
                            </Field>

                            <Field label="Type de commerce" htmlFor="type" required error={errors.type}>
                                <SelectInput id="type" value={data.type} onChange={(e) => setData('type', e.target.value)} error={errors.type}>
                                    {types.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Statut" htmlFor="status" required error={errors.status}>
                                <SelectInput id="status" value={data.status} onChange={(e) => setData('status', e.target.value as typeof data.status)} error={errors.status}>
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Localisation">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="Adresse" htmlFor="address" error={errors.address} className="sm:col-span-2">
                                <TextArea id="address" icon={Building2} rows={2} value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Rue, quartier, repère…" error={errors.address} />
                            </Field>

                            <Field label="Ville" htmlFor="city" required error={errors.city}>
                                <TextInput id="city" icon={MapPin} value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} required />
                            </Field>

                            <Field label="Région / Province" htmlFor="region" error={errors.region}>
                                <TextInput id="region" value={data.region} onChange={(e) => setData('region', e.target.value)} error={errors.region} />
                            </Field>

                            <Field label="Latitude GPS" htmlFor="latitude" hint="(optionnel)" error={errors.latitude}>
                                <TextInput id="latitude" type="number" step="any" value={data.latitude} onChange={(e) => setData('latitude', e.target.value)} error={errors.latitude} className="font-mono" />
                            </Field>

                            <Field label="Longitude GPS" htmlFor="longitude" hint="(optionnel)" error={errors.longitude}>
                                <TextInput id="longitude" type="number" step="any" value={data.longitude} onChange={(e) => setData('longitude', e.target.value)} error={errors.longitude} className="font-mono" />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Contact sur place">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="Responsable" htmlFor="contact_name" error={errors.contact_name}>
                                <TextInput id="contact_name" icon={User} value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} error={errors.contact_name} />
                            </Field>

                            <Field label="Téléphone" htmlFor="contact_phone" error={errors.contact_phone}>
                                <TextInput id="contact_phone" type="tel" icon={Phone} value={data.contact_phone} onChange={(e) => setData('contact_phone', e.target.value)} error={errors.contact_phone} />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Horaires d'ouverture">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="Ouverture" htmlFor="opening_time" error={errors.opening_time}>
                                <TextInput id="opening_time" type="time" icon={Clock} value={data.opening_time} onChange={(e) => setData('opening_time', e.target.value)} error={errors.opening_time} />
                            </Field>

                            <Field label="Fermeture" htmlFor="closing_time" error={errors.closing_time}>
                                <TextInput id="closing_time" type="time" icon={Clock} value={data.closing_time} onChange={(e) => setData('closing_time', e.target.value)} error={errors.closing_time} />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Notes internes">
                        <div className="p-5">
                            <Field label="Notes" htmlFor="notes" hint="(optionnel)" error={errors.notes}>
                                <TextArea id="notes" icon={FileText} rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} error={errors.notes} />
                            </Field>
                        </div>
                    </Panel>

                    <FormActions>
                        <ActionLink href={siteShow(site.id).url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </ActionButton>
                    </FormActions>
                </form>
            </Page>
        </>
    );
}

SiteEdit.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};
