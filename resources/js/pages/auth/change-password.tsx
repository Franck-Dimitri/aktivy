import { Form, Head, Link } from '@inertiajs/react';
import {
    AuthPasswordField,
    AuthPrimaryButton,
} from '@/components/auth/auth-field';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { update } from '@/routes/password/change';

type Props = {
    passwordRules: string;
};

export default function ChangePassword({ passwordRules }: Props) {
    return (
        <>
            <Head title="Choisir un mot de passe" />

            <Form
                {...update.form()}
                resetOnError
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <AuthPasswordField
                            id="password"
                            name="password"
                            label="Nouveau mot de passe"
                            required
                            autoFocus
                            autoComplete="new-password"
                            placeholder="Choisissez un mot de passe"
                            passwordrules={passwordRules}
                            showStrength
                            error={errors.password}
                        />

                        <AuthPasswordField
                            id="password_confirmation"
                            name="password_confirmation"
                            label="Confirmer le mot de passe"
                            required
                            autoComplete="new-password"
                            placeholder="Saisissez-le à nouveau"
                            passwordrules={passwordRules}
                            error={errors.password_confirmation}
                        />

                        <AuthPrimaryButton
                            type="submit"
                            className="mt-1"
                            data-test="change-password-button"
                        >
                            {processing && <Spinner />}
                            Enregistrer mon mot de passe
                        </AuthPrimaryButton>

                        <Link
                            href={logout()}
                            as="button"
                            className="mx-auto cursor-pointer text-sm text-slate-500 underline-offset-4 hover:text-ink hover:underline"
                        >
                            Se déconnecter
                        </Link>
                    </>
                )}
            </Form>
        </>
    );
}

ChangePassword.layout = {
    title: 'Choisissez votre mot de passe',
    description:
        'Votre compte a été créé avec un mot de passe provisoire. Remplacez-le par un mot de passe que vous seul connaissez.',
    showcase: 'security',
};
