import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, FormActions, SelectInput, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as personnelIndex, show as personnelShow, update as personnelUpdate } from '@/routes/personnel';
import type { RoleOption, StatusOption } from '@/types';

type Props = {
    member: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        role: string;
        status: string;
    };
    roles: RoleOption[];
    statuses: StatusOption[];
};

export default function PersonnelEdit({ member, roles, statuses }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, put, processing, errors } = useForm({
        name: member.name,
        phone: member.phone ?? '',
        email: member.email ?? '',
        role: member.role,
        status: member.status,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(personnelUpdate({ personnel: member.id }).url, {
            preserveScroll: true,
            onSuccess: () => toast.success('Membre mis à jour', { description: `Les informations de ${data.name} sont enregistrées.` }),
            onError: toastFormError,
        });
    };

    const toggle = (
        <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            tabIndex={-1}
        >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
    );

    return (
        <>
            <Head title={`Modifier — ${member.name}`} />

            <Page title={`Modifier : ${member.name}`}>
                <form onSubmit={submit} className="flex flex-col gap-6">
                    <Panel title="Identité">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="Nom complet" htmlFor="name" required error={errors.name} className="sm:col-span-2">
                                <TextInput id="name" icon={User} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required />
                            </Field>

                            <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
                                <TextInput id="phone" type="tel" icon={Phone} value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} />
                            </Field>

                            <Field label="E-mail" htmlFor="email" error={errors.email}>
                                <TextInput id="email" type="email" icon={Mail} value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
                            </Field>

                            <Field label="Rôle" htmlFor="role" required error={errors.role}>
                                <SelectInput id="role" icon={ShieldCheck} value={data.role} onChange={(e) => setData('role', e.target.value)} error={errors.role}>
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Statut" htmlFor="status" required error={errors.status}>
                                <SelectInput id="status" value={data.status} onChange={(e) => setData('status', e.target.value)} error={errors.status}>
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Réinitialiser le mot de passe" description="Laissez vide pour conserver le mot de passe actuel.">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="Nouveau mot de passe" htmlFor="password" error={errors.password}>
                                <TextInput id="password" type={showPassword ? 'text' : 'password'} value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} trailing={toggle} />
                            </Field>

                            <Field label="Confirmer" htmlFor="password_confirmation">
                                <TextInput id="password_confirmation" type={showPassword ? 'text' : 'password'} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
                            </Field>
                        </div>
                    </Panel>

                    <FormActions>
                        <ActionLink href={personnelShow({ personnel: member.id }).url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </ActionButton>
                    </FormActions>
                </form>
            </Page>
        </>
    );
}

PersonnelEdit.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};
