import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as personnelIndex, store as personnelStore, create as personnelCreate } from '@/routes/personnel';
import type { RoleOption } from '@/types';

type Props = {
    roles: RoleOption[];
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="grid gap-6 py-8 first:pt-0 lg:grid-cols-[240px_1fr] lg:gap-12">
            <div>
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">{children}</div>
        </section>
    );
}

export default function PersonnelCreate({ roles }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        email: '',
        role: (roles[0]?.value ?? 'field_agent') as string,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(personnelStore().url, {
            preserveScroll: true,
            onSuccess: () => toast.success('Membre ajouté', { description: `${data.name} fait désormais partie de l'équipe.` }),
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
            <Head title="Nouveau membre" />

            <Page title="Nouveau membre" description="Ajoutez un membre à votre équipe.">
                <form onSubmit={submit} className="max-w-4xl rounded-2xl border border-slate-200/70 bg-white">
                    <div className="divide-y divide-slate-100 px-6 py-6 sm:px-8 sm:py-8">
                        <Section title="Identité" description="Les informations de base du membre.">
                            <Field label="Nom complet" htmlFor="name" required error={errors.name} className="sm:col-span-2">
                                <TextInput id="name" icon={User} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ex. : Marie Nguema" error={errors.name} required autoFocus />
                            </Field>

                            <Field label="Téléphone" htmlFor="phone" hint="(identifiant de connexion)" error={errors.phone}>
                                <TextInput id="phone" type="tel" icon={Phone} value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="+237 6XX XXX XXX" error={errors.phone} />
                            </Field>

                            <Field label="E-mail" htmlFor="email" hint="(optionnel)" error={errors.email}>
                                <TextInput id="email" type="email" icon={Mail} value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="marie@example.com" error={errors.email} />
                            </Field>

                            <Field label="Rôle" htmlFor="role" required error={errors.role}>
                                <SelectInput id="role" icon={ShieldCheck} value={data.role} onChange={(e) => setData('role', e.target.value)} error={errors.role}>
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </Section>

                        <Section title="Accès" description="Le membre devra changer son mot de passe à la première connexion.">
                            <Field label="Mot de passe" htmlFor="password" required error={errors.password}>
                                <TextInput id="password" type={showPassword ? 'text' : 'password'} value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} trailing={toggle} required />
                            </Field>

                            <Field label="Confirmer le mot de passe" htmlFor="password_confirmation" required>
                                <TextInput id="password_confirmation" type={showPassword ? 'text' : 'password'} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                            </Field>
                        </Section>
                    </div>

                    <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
                        <ActionLink href={personnelIndex().url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : 'Créer le membre'}
                        </ActionButton>
                    </div>
                </form>
            </Page>
        </>
    );
}

PersonnelCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
        { title: 'Nouveau membre', href: personnelCreate() },
    ],
};
