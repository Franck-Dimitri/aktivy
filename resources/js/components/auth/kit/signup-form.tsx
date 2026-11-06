import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { passwordHint } from '@/lib/password-hint';
import { conditions, confidentialite } from '@/routes';
import { store } from '@/routes/register';
import { StaggerItem } from './auth-card';
import { AuthButton, AuthInput, AuthPasswordInput, authLink } from './fields';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Fields = { company_name: string; name: string; email: string; password: string; password_confirmation: string };

function validate(v: Fields, minLength: number): Partial<Record<keyof Fields, string>> {
    const e: Partial<Record<keyof Fields, string>> = {};
    if (!v.company_name.trim()) e.company_name = 'Indiquez le nom de votre entreprise.';
    if (!v.name.trim()) e.name = 'Indiquez votre nom complet.';
    if (!v.email.trim()) e.email = 'Indiquez votre adresse e-mail.';
    else if (!EMAIL.test(v.email.trim())) e.email = 'Cette adresse e-mail n’est pas valide.';
    if (!v.password) e.password = 'Choisissez un mot de passe.';
    else if (v.password.length < minLength) e.password = `${minLength} caractères minimum.`;
    if (!v.password_confirmation) e.password_confirmation = 'Confirmez le mot de passe.';
    else if (v.password && v.password !== v.password_confirmation) e.password_confirmation = 'Les deux mots de passe ne correspondent pas.';
    return e;
}

export function SignupForm({ passwordRules }: { passwordRules: string }) {
    const form = useForm<Fields>({ company_name: '', name: '', email: '', password: '', password_confirmation: '' });
    const { data, setData, errors, processing } = form;
    const minLength = Number(/minlength:\s*(\d+)/.exec(passwordRules)?.[1] ?? 8);

    const change = (key: keyof Fields, value: string) => {
        setData(key, value);
        if (errors[key]) form.clearErrors(key);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const invalid = validate(data, minLength);
        form.clearErrors();
        if (Object.keys(invalid).length) {
            form.setError(invalid);
            return;
        }
        form.transform((d) => ({ ...d, company_name: d.company_name.trim(), name: d.name.trim(), email: d.email.trim() }));
        form.post(store.url(), { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <StaggerItem className="grid gap-4 sm:grid-cols-2 sm:gap-3">
                <AuthInput id="company_name" name="company_name" label="Nom de l’entreprise" autoFocus autoComplete="organization" placeholder="Promo Services SARL" maxLength={255} value={data.company_name} onChange={(e) => change('company_name', e.target.value)} error={errors.company_name} />
                <AuthInput id="name" name="name" label="Nom complet" autoComplete="name" placeholder="Jean Mbarga" maxLength={255} value={data.name} onChange={(e) => change('name', e.target.value)} error={errors.name} />
            </StaggerItem>

            <StaggerItem>
                <AuthInput id="email" name="email" type="email" inputMode="email" label="Adresse e-mail" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="vous@entreprise.cm" maxLength={255} value={data.email} onChange={(e) => change('email', e.target.value)} error={errors.email} />
            </StaggerItem>

            <StaggerItem className="grid gap-4 sm:grid-cols-2 sm:gap-3">
                <AuthPasswordInput
                    id="password"
                    name="password"
                    label="Mot de passe"
                    autoComplete="new-password"
                    placeholder={`${minLength}+ caractères`}
                    passwordrules={passwordRules}
                    value={data.password}
                    onChange={(e) => change('password', e.target.value)}
                    error={errors.password}
                />
                <AuthPasswordInput
                    id="password_confirmation"
                    name="password_confirmation"
                    label="Confirmation"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    passwordrules={passwordRules}
                    value={data.password_confirmation}
                    onChange={(e) => change('password_confirmation', e.target.value)}
                    error={errors.password_confirmation}
                />
                <p className="-mt-1 text-xs leading-snug text-slate-500 sm:col-span-2">{passwordHint(passwordRules)}</p>
            </StaggerItem>

            <StaggerItem>
                <AuthButton type="submit" loading={processing} data-test="register-user-button">
                    Créer mon compte
                </AuthButton>
                <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                    En créant un compte, vous acceptez les{' '}
                    <a href={conditions().url} target="_blank" rel="noopener" className={authLink}>
                        Conditions
                    </a>{' '}
                    et la{' '}
                    <a href={confidentialite().url} target="_blank" rel="noopener" className={authLink}>
                        Politique de confidentialité
                    </a>
                    .
                </p>
            </StaggerItem>
        </form>
    );
}
