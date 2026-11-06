import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/auth/kit/login-form';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */

type Props = {
    status?: string;
    canResetPassword: boolean;
    isDev?: boolean;
};

export default function Login({ status, canResetPassword, isDev }: Props) {
    return (
        <>
            <Head title="Connexion" />
            <LoginForm status={status} canResetPassword={canResetPassword} isDev={isDev ?? false} />
        </>
    );
}

Login.layout = {
    title: 'Bon retour',
    description: 'Connectez-vous à votre espace Motriks.',
    /* @chisel-registration */
    headerLink: {
        text: 'Pas encore de compte ?',
        label: 'Créer un compte',
        href: register().url,
    },
    /* @end-chisel-registration */
};
