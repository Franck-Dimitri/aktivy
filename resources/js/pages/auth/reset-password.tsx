import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import {
    AuthField,
    AuthPasswordField,
    AuthPrimaryButton,
} from '@/components/auth/auth-field';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Nouveau mot de passe" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <AuthField
                            id="email"
                            name="email"
                            type="email"
                            label="Compte"
                            icon={Mail}
                            autoComplete="email"
                            value={email}
                            readOnly
                            error={errors.email}
                        />

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
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            Enregistrer le mot de passe
                        </AuthPrimaryButton>
                    </>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Choisissez un nouveau mot de passe',
    description: 'Il remplacera l’ancien dès que vous l’aurez enregistré.',
    showcase: 'security',
};
