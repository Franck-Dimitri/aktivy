import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { AuthField, AuthPrimaryButton } from '@/components/auth/auth-field';
import AuthStatus from '@/components/auth/auth-status';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Mot de passe oublié" />

            {status && <AuthStatus>{status}</AuthStatus>}

            <Form {...email.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <AuthField
                            id="email"
                            name="email"
                            type="email"
                            label="Adresse e-mail"
                            icon={Mail}
                            required
                            autoFocus
                            autoComplete="email"
                            placeholder="vous@entreprise.com"
                            error={errors.email}
                        />

                        <AuthPrimaryButton
                            className="mt-1"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Recevoir le lien
                        </AuthPrimaryButton>
                    </>
                )}
            </Form>

            <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                Vous vous connectez avec votre numéro de téléphone ? Demandez à
                votre responsable de réinitialiser votre mot de passe.
            </p>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Mot de passe oublié',
    description:
        'Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.',
    showcase: 'security',
    headerLink: {
        text: 'Vous l’avez retrouvé ?',
        label: 'Se connecter',
        href: login().url,
    },
};
