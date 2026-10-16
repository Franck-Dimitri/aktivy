import { useForm } from '@inertiajs/react';
import { Building2, Clock, FileText, MapPin, Phone, Store, Tag, User } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Field, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { update as siteUpdate } from '@/routes/sites';
import type { SiteStatusOption, SiteTypeOption } from '@/types';

type EditableSite = {
    id: number;
    name: string;
    code: string | null;
    type: string;
    address: string | null;
    city: string;
    region: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    contact_name: string | null;
    contact_phone: string | null;
    opening_time: string | null;
    closing_time: string | null;
    notes: string | null;
    status: string;
};

type Props = {
    site: EditableSite;
    types: SiteTypeOption[];
    statuses: SiteStatusOption[];
    onClose: () => void;
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{title}</p>
            <div className="grid gap-5 sm:grid-cols-2">{children}</div>
        </div>
    );
}

/** Modal d'édition d'un site. À monter uniquement quand il est ouvert. */
export function EditSiteModal({ site, types, statuses, onClose }: Props) {
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
        // « 08:00:00 » → « 08:00 » pour respecter le format H:i attendu par le serveur
        opening_time: (site.opening_time ?? '').slice(0, 5),
        closing_time: (site.closing_time ?? '').slice(0, 5),
        notes: site.notes ?? '',
        status: site.status ?? 'active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(siteUpdate(site.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Site mis à jour', { description: `Les modifications de « ${data.name} » sont enregistrées.` });
                onClose();
            },
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={onClose} size="lg" title="Modifier le site" description="Mettez à jour les informations de ce point de vente.">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
                    <Group title="Identité">
                        <Field label="Nom du site" htmlFor="edit-name" required error={errors.name} className="sm:col-span-2">
                            <TextInput id="edit-name" icon={Store} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required autoFocus />
                        </Field>

                        <Field label="Code interne" htmlFor="edit-code" hint="(optionnel)" error={errors.code}>
                            <TextInput id="edit-code" icon={Tag} value={data.code} onChange={(e) => setData('code', e.target.value)} maxLength={30} error={errors.code} className="font-mono" />
                        </Field>

                        <Field label="Type de commerce" htmlFor="edit-type" required error={errors.type}>
                            <SelectInput id="edit-type" value={data.type} onChange={(e) => setData('type', e.target.value)} error={errors.type}>
                                {types.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </SelectInput>
                        </Field>

                        <Field label="Statut" htmlFor="edit-status" required error={errors.status}>
                            <SelectInput id="edit-status" value={data.status} onChange={(e) => setData('status', e.target.value)} error={errors.status}>
                                {statuses.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </SelectInput>
                        </Field>
                    </Group>

                    <Group title="Localisation">
                        <Field label="Adresse" htmlFor="edit-address" error={errors.address} className="sm:col-span-2">
                            <TextArea id="edit-address" icon={Building2} rows={2} value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Rue, quartier, repère…" error={errors.address} />
                        </Field>

                        <Field label="Ville" htmlFor="edit-city" required error={errors.city}>
                            <TextInput id="edit-city" icon={MapPin} value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} required />
                        </Field>

                        <Field label="Région / Province" htmlFor="edit-region" error={errors.region}>
                            <TextInput id="edit-region" value={data.region} onChange={(e) => setData('region', e.target.value)} error={errors.region} />
                        </Field>

                        <Field label="Latitude GPS" htmlFor="edit-latitude" hint="(optionnel)" error={errors.latitude}>
                            <TextInput id="edit-latitude" type="number" step="any" value={data.latitude} onChange={(e) => setData('latitude', e.target.value)} error={errors.latitude} className="font-mono" />
                        </Field>

                        <Field label="Longitude GPS" htmlFor="edit-longitude" hint="(optionnel)" error={errors.longitude}>
                            <TextInput id="edit-longitude" type="number" step="any" value={data.longitude} onChange={(e) => setData('longitude', e.target.value)} error={errors.longitude} className="font-mono" />
                        </Field>
                    </Group>

                    <Group title="Contact sur place">
                        <Field label="Responsable" htmlFor="edit-contact-name" error={errors.contact_name}>
                            <TextInput id="edit-contact-name" icon={User} value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} error={errors.contact_name} />
                        </Field>

                        <Field label="Téléphone" htmlFor="edit-contact-phone" error={errors.contact_phone}>
                            <TextInput id="edit-contact-phone" type="tel" icon={Phone} value={data.contact_phone} onChange={(e) => setData('contact_phone', e.target.value)} error={errors.contact_phone} />
                        </Field>
                    </Group>

                    <Group title="Horaires d'ouverture">
                        <Field label="Ouverture" htmlFor="edit-opening" error={errors.opening_time}>
                            <TextInput id="edit-opening" type="time" icon={Clock} value={data.opening_time} onChange={(e) => setData('opening_time', e.target.value)} error={errors.opening_time} />
                        </Field>

                        <Field label="Fermeture" htmlFor="edit-closing" error={errors.closing_time}>
                            <TextInput id="edit-closing" type="time" icon={Clock} value={data.closing_time} onChange={(e) => setData('closing_time', e.target.value)} error={errors.closing_time} />
                        </Field>
                    </Group>

                    <Group title="Notes internes">
                        <Field label="Notes" htmlFor="edit-notes" hint="(optionnel)" error={errors.notes} className="sm:col-span-2">
                            <TextArea id="edit-notes" icon={FileText} rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} error={errors.notes} />
                        </Field>
                    </Group>
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={onClose}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Enregistrer'}
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
