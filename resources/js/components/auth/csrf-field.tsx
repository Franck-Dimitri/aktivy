import { usePage } from '@inertiajs/react';

/**
 * Jeton anti-falsification en champ caché : permet aux formulaires de connexion de fonctionner
 * même quand le JavaScript ne s'exécute pas (ancien téléphone, réseau qui coupe le chargement).
 * Le formulaire part alors en POST classique et Laravel l'accepte.
 */
export function CsrfField() {
    const token = usePage<{ csrf_token?: string }>().props.csrf_token;

    return token ? <input type="hidden" name="_token" value={token} /> : null;
}
