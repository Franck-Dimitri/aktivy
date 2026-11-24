import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'prefetch'> & {
    href: string;
};

/**
 * Lien entre pages de connexion (« Mot de passe oublié », « Créer un compte »…) : navigation Inertia
 * ordinaire, préchargée au survol ou au toucher. Plus de transition animée : elle bloquait l'affichage
 * sur les téléphones lents.
 */
export function TransitionLink({ href, ...props }: Props) {
    return <Link href={href} prefetch {...props} />;
}
