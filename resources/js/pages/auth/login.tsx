import { Form, Head, Link } from '@inertiajs/react';
import { AtSign } from 'lucide-react';
import { useState } from 'react';
import {
    AuthField,
    AuthPasswordField,
    AuthPrimaryButton,
} from '@/components/auth/auth-field';
import AuthStatus from '@/components/auth/auth-status';
import DevTestAccounts from '@/components/auth/dev-test-accounts';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */
import { store } from '@/routes/login';
import { request } from '@/routes/password';
/* @chisel-passkeys */
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

type Props = {
    status?: string;
    canResetPassword: boolean;
    isDev?: boolean;
};

export default function Login({ status, canResetPassword, isDev }: Props) {
    const [loginValue, setLoginValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const showDevAccounts = isDev ?? true;

    const handleSelectAccount = (
        selectedLogin: string,
        selectedPass: string,
        autoSubmit = false,
    ) => {
        setLoginValue(selectedLogin);
        setPasswordValue(selectedPass);

        setTimeout(() => {
            const loginInput = document.getElementById(
                'login',
            ) as HTMLInputElement | null;
            const passInput = document.getElementById(
                'password',
            ) as HTMLInputElement | null;

            if (loginInput) {
                loginInput.value = selectedLogin;
                loginInput.dispatchEvent(new Event('input', { bubbles: true }));
                loginInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (passInput) {
                passInput.value = selectedPass;
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                passInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            if (autoSubmit) {
                const submitButton = document.querySelector<HTMLButtonElement>(
                    'button[data-test="login-button"]',
                );
                submitButton?.click();
            }
        }, 50);
    };

    return (
        <>
            <Head title="Connexion" />

            {status && <AuthStatus>{status}</AuthStatus>}

            {showDevAccounts && (
                <DevTestAccounts
                    onSelectAccount={handleSelectAccount}
                    currentLogin={loginValue}
                />
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <AuthField
                            id="login"
                            name="login"
                            type="text"
                            label="E-mail ou téléphone"
                            icon={AtSign}
                            required
                            autoFocus
                            autoComplete="username"
                            autoCapitalize="none"
                            placeholder="vous@entreprise.com ou 676383986"
                            value={loginValue}
                            onChange={(e) => setLoginValue(e.target.value)}
                            error={errors.login}
                        />

                        <AuthPasswordField
                            id="password"
                            name="password"
                            label="Mot de passe"
                            required
                            autoComplete="current-password"
                            placeholder="Votre mot de passe"
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            error={errors.password}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <label
                                htmlFor="remember"
                                className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600"
                            >
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    className="size-[18px] rounded-[5px] border-slate-300"
                                />
                                Rester connecté
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={request()}
                                    className="text-sm font-semibold text-aktivy-deep underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                                >
                                    Mot de passe oublié ?
                                </Link>
                            )}
                        </div>

                        <AuthPrimaryButton
                            type="submit"
                            className="mt-1"
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Se connecter
                        </AuthPrimaryButton>
                    </>
                )}
            </Form>

            {/* @chisel-passkeys */}
            <div className="mt-6">
                <PasskeyVerify separator="ou" separatorPosition="before" />
            </div>
            {/* @end-chisel-passkeys */}
        </>
    );
}

Login.layout = {
    title: 'Bon retour sur Motriks',
    description:
        'Gérants et superviseurs se connectent avec leur e-mail, les hôtesses avec leur numéro de téléphone.',
    showcase: 'login',
    /* @chisel-registration */
    headerLink: {
        text: 'Nouvelle entreprise ?',
        label: 'Créer un espace',
        href: register().url,
    },
    /* @end-chisel-registration */
};
