import { Head } from '@inertiajs/react';
import type { DevAccount } from '@/components/auth/dev-test-accounts';
import { LoginForm } from '@/components/auth/kit/login-form';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */

type Props = {
    status?: string;
    canResetPassword: boolean;
    /** Comptes de démo : envoyés par le serveur en local uniquement (vide en production). */
    devAccounts?: DevAccount[];
};

export default function Login({ status, canResetPassword, devAccounts }: Props) {
    return (
        <>
            <Head title="Connexion" />
            <LoginForm status={status} canResetPassword={canResetPassword} devAccounts={devAccounts} />
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
