import { useForm } from '@inertiajs/react';
import { FlaskConical, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import AuthStatus from '@/components/auth/auth-status';
import DevTestAccounts from '@/components/auth/dev-test-accounts';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { StaggerItem } from './auth-card';
import { TransitionLink } from './auth-transition';
import { AuthButton, AuthCheckbox, AuthInput, AuthPasswordInput, authLink } from './fields';
import { SocialButtons } from './social-buttons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Que des chiffres, espaces, +, tirets, points ou parenthèses : c'est un numéro de téléphone. */
const looksLikePhone = (v: string) => v.trim() !== '' && /^[+\d\s().-]+$/.test(v.trim());

type Fields = { login: string; password: string; remember: boolean };

function validate({ login, password }: Fields): Partial<Record<keyof Fields, string>> {
    const errors: Partial<Record<keyof Fields, string>> = {};
    const value = login.trim();

    if (!value) errors.login = 'Saisissez votre e-mail ou votre numéro de téléphone.';
    else if (looksLikePhone(value)) {
        if (value.replace(/\D/g, '').length < 8) errors.login = 'Ce numéro paraît incomplet.';
    } else if (!EMAIL.test(value)) errors.login = 'Cette adresse e-mail n’est pas valide.';

    if (!password) errors.password = 'Saisissez votre mot de passe.';

    return errors;
}

export function LoginForm({ status, canResetPassword, isDev }: { status?: string; canResetPassword: boolean; isDev: boolean }) {
    const form = useForm<Fields>({ login: '', password: '', remember: false });
    const { data, setData, errors, processing } = form;

    const send = (values: Fields) => {
        const invalid = validate(values);
        form.clearErrors();
        if (Object.keys(invalid).length) {
            form.setError(invalid);
            return;
        }
        form.transform(() => ({ ...values, login: values.login.trim() }));
        form.post(store.url(), { onFinish: () => form.reset('password') });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        send(data);
    };

    const change = (key: 'login' | 'password', value: string) => {
        setData(key, value);
        if (errors[key]) form.clearErrors(key);
    };

    return (
        <>
            {status && (
                <StaggerItem>
                    <AuthStatus>{status}</AuthStatus>
                </StaggerItem>
            )}

            <StaggerItem className="mb-4">
                <SocialButtons separator="ou avec votre identifiant" />
            </StaggerItem>

            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <StaggerItem>
                    <AuthInput
                        id="login"
                        name="login"
                        type="text"
                        inputMode={looksLikePhone(data.login) ? 'tel' : 'email'}
                        label="E-mail ou téléphone"
                        autoFocus
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="vous@mail.cm ou 6XX XX XX XX"
                        value={data.login}
                        onChange={(e) => change('login', e.target.value)}
                        error={errors.login}
                    />
                </StaggerItem>

                <StaggerItem>
                    <AuthPasswordInput
                        id="password"
                        name="password"
                        label="Mot de passe"
                        labelAside={
                            canResetPassword && (
                                <TransitionLink href={request().url} className={`text-[13px] whitespace-nowrap ${authLink}`}>
                                    Mot de passe oublié ?
                                </TransitionLink>
                            )
                        }
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={data.password}
                        onChange={(e) => change('password', e.target.value)}
                        error={errors.password}
                    />
                </StaggerItem>

                <StaggerItem>
                    <AuthCheckbox id="remember" name="remember" checked={data.remember} onChange={(v) => setData('remember', v)}>
                        Se souvenir de moi
                    </AuthCheckbox>
                </StaggerItem>

                <StaggerItem>
                    <AuthButton type="submit" loading={processing} data-test="login-button">
                        Se connecter
                    </AuthButton>
                </StaggerItem>
            </form>

            {isDev && (
                <DevAccountsDock
                    currentLogin={data.login}
                    onSelect={(login, password, autoSubmit) => {
                        const values = { ...data, login, password };
                        form.setData(values);
                        form.clearErrors();
                        if (autoSubmit) send(values);
                    }}
                />
            )}
        </>
    );
}

/** Comptes de test (environnement local uniquement) : tiroir rattaché à la page, hors de la carte animée. */
function DevAccountsDock({ currentLogin, onSelect }: { currentLogin: string; onSelect: (login: string, password: string, autoSubmit?: boolean) => void }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
        <div className="theme-light fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
            {open && (
                <div className="max-h-[70dvh] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-ink shadow-2xl">
                    <DevTestAccounts
                        currentLogin={currentLogin}
                        onSelectAccount={(login, password, autoSubmit) => {
                            onSelect(login, password, autoSubmit);
                            if (autoSubmit) setOpen(false);
                        }}
                    />
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-ink"
            >
                {open ? <X className="size-3.5" /> : <FlaskConical className="size-3.5 text-motriks" />}
                Comptes de test
            </button>
        </div>,
        document.body,
    );
}
