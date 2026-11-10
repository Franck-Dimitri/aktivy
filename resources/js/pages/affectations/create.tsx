import { Head, useForm } from '@inertiajs/react';
import { CalendarRange, Clock, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import { SitePicker, siteError } from '@/components/affectations/site-picker';
import { cn } from '@/lib/utils';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, FormActions, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as affectationsIndex, store as affectationStore, create as affectationCreate } from '@/routes/affectations';
import type { AffectationSelectOption } from '@/types';

type Props = {
    sites: AffectationSelectOption[];
    staff: AffectationSelectOption[];
    default_site_id: number | null;
    default_agent_id: number | null;
};

export default function AffectationCreate({ sites, staff, default_site_id, default_agent_id }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        site_ids: default_site_id ? [default_site_id] : ([] as number[]),
        user_id: default_agent_id ?? ('' as number | ''),
        starts_on: '',
        ends_on: '',
        slot_start: '',
        slot_end: '',
        notes: '',
    });

    // Un superviseur peut superviser plusieurs points de vente : cases à cocher
    const isSupervisor = staff.find((s) => s.value === data.user_id)?.role === 'supervisor';

    const chooseMember = (userId: number | '') => {
        const supervisor = staff.find((s) => s.value === userId)?.role === 'supervisor';
        // Une hôtesse n'a qu'un point de vente : on garde le premier coché
        setData((d) => ({ ...d, user_id: userId, site_ids: supervisor ? d.site_ids : d.site_ids.slice(0, 1) }));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(affectationStore().url, {
            preserveScroll: true,
            onSuccess: () =>
                toast.success(data.site_ids.length > 1 ? 'Affectations créées' : 'Affectation créée', {
                    description: data.site_ids.length > 1 ? `Le superviseur suit ${data.site_ids.length} points de vente.` : 'Le membre a bien été affecté au site.',
                }),
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title="Nouvelle affectation" />

            <Page title="Nouvelle affectation" description="Assignez un membre à un point de vente.">
                <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                    <Panel title="Qui et où">
                        <div className={cn('grid gap-5 p-6', !isSupervisor && 'sm:grid-cols-2')}>
                            <Field label="Membre" htmlFor="user_id" required error={errors.user_id}>
                                <SelectInput
                                    id="user_id"
                                    icon={User}
                                    value={data.user_id}
                                    onChange={(e) => chooseMember(Number(e.target.value) || '')}
                                    error={errors.user_id}
                                    required
                                >
                                    <option value="">Choisir un membre…</option>
                                    {staff.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label} ({s.role_label})</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field
                                label={isSupervisor ? 'Points de vente supervisés' : 'Site'}
                                htmlFor="site_id"
                                hint={isSupervisor ? '(cochez-en un ou plusieurs)' : undefined}
                                required
                                error={siteError(errors)}
                            >
                                <SitePicker
                                    id="site_id"
                                    sites={sites}
                                    multiple={isSupervisor}
                                    value={data.site_ids}
                                    onChange={(ids) => setData('site_ids', ids)}
                                    error={siteError(errors)}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Période et créneau" description="Le créneau horaire est optionnel : il précise les heures de prise de poste attendues.">
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
                                <TextArea
                                    id="notes"
                                    icon={FileText}
                                    rows={3}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Instructions particulières, contexte…"
                                    error={errors.notes}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <FormActions>
                        <ActionLink href={affectationsIndex().url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : data.site_ids.length > 1 ? `Créer les ${data.site_ids.length} affectations` : "Créer l'affectation"}
                        </ActionButton>
                    </FormActions>
                </form>
            </Page>
        </>
    );
}

AffectationCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Affectations', href: affectationsIndex() },
        { title: 'Nouvelle', href: affectationCreate() },
    ],
};