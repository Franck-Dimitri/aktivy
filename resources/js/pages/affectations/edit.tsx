import { Head, useForm } from '@inertiajs/react';
import { CalendarRange, Clock, FileText, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, FormActions, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as affectationsIndex, update as affectationUpdate } from '@/routes/affectations';
import type { AffectationSelectOption } from '@/types';

type AffectationData = {
    id: number;
    site_id: number;
    user_id: number;
    starts_on: string;
    ends_on: string | null;
    slot_start: string | null;
    slot_end: string | null;
    status: string;
    notes: string | null;
};

type StatusOption = { value: string; label: string };

type Props = {
    affectation: AffectationData;
    sites: AffectationSelectOption[];
    staff: AffectationSelectOption[];
    statuses: StatusOption[];
};

export default function AffectationEdit({ affectation, sites, staff, statuses }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        site_id: affectation.site_id as number | '',
        user_id: affectation.user_id as number | '',
        starts_on: affectation.starts_on,
        ends_on: affectation.ends_on ?? '',
        slot_start: affectation.slot_start ?? '',
        slot_end: affectation.slot_end ?? '',
        status: affectation.status,
        notes: affectation.notes ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(affectationUpdate({ affectation: affectation.id }).url, {
            preserveScroll: true,
            onSuccess: () => toast.success('Affectation mise à jour', { description: 'Les modifications sont enregistrées.' }),
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title="Modifier l'affectation" />

            <Page title="Modifier l'affectation">
                <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                    <Panel title="Qui et où">
                        <div className="grid gap-5 p-6 sm:grid-cols-2">
                            <Field label="Membre" htmlFor="user_id" required error={errors.user_id}>
                                <SelectInput
                                    id="user_id"
                                    icon={User}
                                    value={data.user_id}
                                    onChange={(e) => setData('user_id', Number(e.target.value) || '')}
                                    error={errors.user_id}
                                    required
                                >
                                    <option value="">Choisir…</option>
                                    {staff.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label} ({s.role_label})</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Site" htmlFor="site_id" required error={errors.site_id}>
                                <SelectInput
                                    id="site_id"
                                    icon={MapPin}
                                    value={data.site_id}
                                    onChange={(e) => setData('site_id', Number(e.target.value) || '')}
                                    error={errors.site_id}
                                    required
                                >
                                    <option value="">Choisir…</option>
                                    {sites.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Statut" htmlFor="status" required error={errors.status} className="sm:col-span-2">
                                <SelectInput id="status" value={data.status} onChange={(e) => setData('status', e.target.value)} error={errors.status} required>
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Période et créneau" description="Le créneau horaire est optionnel.">
                        <div className="grid gap-5 p-6 sm:grid-cols-2">
                            <Field label="Date de début" htmlFor="starts_on" required error={errors.starts_on}>
                                <TextInput id="starts_on" type="date" icon={CalendarRange} value={data.starts_on} onChange={(e) => setData('starts_on', e.target.value)} error={errors.starts_on} required />
                            </Field>
                            <Field label="Date de fin" htmlFor="ends_on" hint="(vide = permanent)" error={errors.ends_on}>
                                <TextInput id="ends_on" type="date" icon={CalendarRange} value={data.ends_on} onChange={(e) => setData('ends_on', e.target.value)} error={errors.ends_on} />
                            </Field>

                            <div className="border-t border-slate-100 sm:col-span-2" />

                            <Field label="Heure de début" htmlFor="slot_start" error={errors.slot_start}>
                                <TextInput id="slot_start" type="time" icon={Clock} value={data.slot_start} onChange={(e) => setData('slot_start', e.target.value)} error={errors.slot_start} />
                            </Field>
                            <Field label="Heure de fin" htmlFor="slot_end" error={errors.slot_end}>
                                <TextInput id="slot_end" type="time" icon={Clock} value={data.slot_end} onChange={(e) => setData('slot_end', e.target.value)} error={errors.slot_end} />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Notes internes">
                        <div className="p-6">
                            <Field label="Notes" htmlFor="notes" hint="(optionnel)" error={errors.notes}>
                                <TextArea id="notes" icon={FileText} rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} error={errors.notes} />
                            </Field>
                        </div>
                    </Panel>

                    <FormActions>
                        <ActionLink href={affectationsIndex().url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </ActionButton>
                    </FormActions>
                </form>
            </Page>
        </>
    );
}

AffectationEdit.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Affectations', href: affectationsIndex() },
    ],
};