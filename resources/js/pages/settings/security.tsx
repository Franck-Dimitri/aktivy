import { Head, useForm } from '@inertiajs/react';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { useRef, type FormEvent } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { toastFormError } from '@/lib/form-toast';
import { edit } from '@/routes/security';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */
import { CardBody, PasswordField, SaveFooter, SettingsCard, SettingsRow } from './settings-kit';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps /* @end-chisel-2fa */;

/** Traduit la règle du serveur (« minlength: 12; required: upper; … ») en une phrase courte. */
function passwordHint(rules: string) {
    const min = /minlength:\s*(\d+)/.exec(rules)?.[1] ?? '8';
    const strict = /required:\s*(upper|digit|special)/.test(rules);
    return strict ? `${min} caractères minimum, avec majuscule, chiffre et symbole.` : `${min} caractères minimum.`;
}

const EMPTY = { current_password: '', password: '', password_confirmation: '' };

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const form = useForm(EMPTY);
    const { data, setData, errors, processing, isDirty } = form;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(SecurityController.update().url, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
            onError: (errs) => {
                form.reset();
                if (errs.current_password) currentPasswordInput.current?.focus();
                else if (errs.password) passwordInput.current?.focus();
                toastFormError(errs);
            },
        });
    };

    const mismatch = data.password_confirmation !== '' && data.password !== data.password_confirmation;

    return (
        <>
            <Head title="Sécurité du compte" />

            <SettingsCard icon={LockKeyhole} title="Mot de passe" description="Choisissez un mot de passe long, que vous n’utilisez nulle part ailleurs.">
                <form onSubmit={submit}>
                    <CardBody>
                        <SettingsRow label="Mot de passe actuel" htmlFor="current_password" error={errors.current_password}>
                            <PasswordField id="current_password" ref={currentPasswordInput} icon={KeyRound} value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} error={errors.current_password} autoComplete="current-password" />
                        </SettingsRow>

                        <div className="h-px bg-slate-100 dark:bg-sidebar-border" />

                        <SettingsRow label="Nouveau mot de passe" htmlFor="password" hint={passwordHint(props.passwordRules)} error={errors.password}>
                            <PasswordField id="password" ref={passwordInput} icon={LockKeyhole} value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} autoComplete="new-password" passwordrules={props.passwordRules} />
                        </SettingsRow>

                        <SettingsRow label="Confirmation" htmlFor="password_confirmation" error={errors.password_confirmation ?? (mismatch ? 'Les deux mots de passe ne correspondent pas.' : undefined)}>
                            <PasswordField id="password_confirmation" icon={LockKeyhole} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} error={errors.password_confirmation ?? (mismatch ? ' ' : undefined)} autoComplete="new-password" passwordrules={props.passwordRules} />
                        </SettingsRow>
                    </CardBody>

                    <SaveFooter dirty={isDirty} processing={processing} idle="Vous restez connecté après le changement." label="Changer le mot de passe" onCancel={() => { form.reset(); form.clearErrors(); }} testId="update-password-button" />
                </form>
            </SettingsCard>

            {/* @chisel-2fa */}
            <ManageTwoFactor canManageTwoFactor={props.canManageTwoFactor} requiresConfirmation={props.requiresConfirmation} twoFactorEnabled={props.twoFactorEnabled} />
            {/* @end-chisel-2fa */}

            {/* @chisel-passkeys */}
            <ManagePasskeys canManagePasskeys={props.canManagePasskeys} passkeys={props.passkeys} />
            {/* @end-chisel-passkeys */}
        </>
    );
}

Security.layout = {
    breadcrumbs: [{ title: 'Mon compte', href: edit() }],
};
