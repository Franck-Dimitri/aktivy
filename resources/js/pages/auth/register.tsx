import { SignupForm } from '@/components/auth/kit/signup-form';
import { Seo } from '@/components/seo';
import { login } from '@/routes';

export default function Register({ passwordRules }: { passwordRules: string }) {
    return (
        <>
            <Seo
                title="Créer un espace entreprise - Motriks"
                description="Créez gratuitement l'espace de votre entreprise sur Motriks et pilotez vos hôtesses, vos stocks et vos ventes terrain en temps réel."
                path="/register"
            />
            <SignupForm passwordRules={passwordRules} />
        </>
    );
}

Register.layout = {
    title: 'Créer un compte',
    description: 'Créez l’espace de votre entreprise sur Motriks.',
    headerLink: {
        text: 'Déjà un compte ?',
        label: 'Se connecter',
        href: login().url,
    },
};
