import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, CalendarDays, Mail, MailWarning, Phone, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { TextInput } from '@/components/page/form-fields';
import { toastFormError } from '@/lib/form-toast';
import { roleLabels } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';
import { CardBody, SaveFooter, SettingsCard, SettingsRow } from './settings-kit';

const chip = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ring-1';

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => Array.from(p)[0]).join('').toUpperCase() || '?';
}

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const form = useForm({ name: user.name, email: user.email ?? '' });
    const { data, setData, processing, errors, isDirty } = form;

    const phoneLogin = user.phone !== null;
    const unverified = mustVerifyEmail && user.email !== null && user.email_verified_at === null;
    const since = new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const role = roleLabels[user.role] ?? user.role;
    const managed = user.role === 'field_agent' || user.role === 'supervisor';

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.patch(ProfileController.update().url, {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title="Mon profil" />

            {/* Identité */}
            <section className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:p-6 dark:border-sidebar-border dark:bg-card">
                <span className="flex size-12 shrink-0 items-center sm:size-14 justify-center rounded-2xl bg-gradient-to-br from-motriks to-motriks-deep text-lg font-semibold tracking-wide text-white shadow-sm shadow-green-700/20">
                    {initials(data.name || user.name)}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold tracking-tight text-ink">{user.name}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                        {role}
                        {auth.company && <> · {auth.company.name}</>}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                        {user.email && (unverified || user.email_verified_at) && (
                            <span className={cn(chip, unverified ? 'bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-motriks-soft text-motriks-deep ring-green-200/70')}>
                                {unverified ? <MailWarning className="size-3.5" /> : <BadgeCheck className="size-3.5" />}
                                {unverified ? 'E-mail à confirmer' : 'E-mail confirmé'}
                            </span>
                        )}
                        <span className={cn(chip, 'bg-slate-50 text-slate-600 ring-slate-200/80 dark:bg-white/5 dark:text-slate-300')}>
                            <CalendarDays className="size-3.5" />
                            Membre depuis {since}
                        </span>
                    </div>
                </div>
            </section>

            <SettingsCard icon={UserRound} title="Informations personnelles" description="Votre nom apparaît sur les rapports, les affectations et les notifications.">
                <form onSubmit={submit}>
                    <CardBody>
                        <SettingsRow label="Nom complet" htmlFor="name" required error={errors.name}>
                            <TextInput id="name" icon={UserRound} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required maxLength={255} autoComplete="name" placeholder="Prénom et nom" />
                        </SettingsRow>

                        <SettingsRow
                            label="E-mail"
                            htmlFor="email"
                            required={!phoneLogin}
                            hint={phoneLogin ? 'Facultatif : sert aux e-mails et à la récupération du compte.' : 'Sert à vous connecter et à recevoir les e-mails.'}
                            error={errors.email}
                        >
                            <TextInput id="email" type="email" icon={Mail} value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required={!phoneLogin} maxLength={255} autoComplete="username" placeholder="vous@entreprise.cm" />

                            {unverified && (
                                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                                    <MailWarning className="mt-px size-4 shrink-0" />
                                    {status === 'verification-link-sent' ? (
                                        <p>Un nouveau lien de confirmation vient de vous être envoyé. Pensez à regarder dans les courriers indésirables.</p>
                                    ) : (
                                        <p>
                                            Votre adresse n’est pas encore confirmée.{' '}
                                            <Link href={send()} as="button" preserveScroll className="font-semibold underline underline-offset-2 hover:no-underline">
                                                Renvoyer le lien
                                            </Link>
                                        </p>
                                    )}
                                </div>
                            )}
                        </SettingsRow>

                        {phoneLogin && (
                            <SettingsRow label="Téléphone" htmlFor="phone" hint={managed ? 'Votre identifiant de connexion. Pour le changer, adressez-vous à votre responsable.' : 'Votre identifiant de connexion.'}>
                                <TextInput id="phone" type="tel" icon={Phone} value={user.phone ?? ''} readOnly disabled className="tabular-nums" />
                            </SettingsRow>
                        )}
                    </CardBody>

                    <SaveFooter
                        dirty={isDirty}
                        processing={processing}
                        idle="Vos informations sont à jour."
                        onCancel={() => {
                            form.reset();
                            form.clearErrors();
                        }}
                        testId="update-profile-button"
                    />
                </form>
            </SettingsCard>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Mon compte', href: edit() }],
};
