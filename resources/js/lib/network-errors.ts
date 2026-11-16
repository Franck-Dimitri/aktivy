import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { markUnstable } from '@/lib/connection';

type StartedVisit = { url: URL; method: string; async: boolean };

/**
 * Page ou envoi impossible faute de réseau, pour tous les rôles : un message clair au lieu d'un clic
 * qui ne fait rien. Rien n'est gardé sur le téléphone (les données d'une équipe n'ont pas à y rester) :
 * - une page qui ne s'ouvre pas : « Réessayer » la rouvre ;
 * - un formulaire non envoyé : la saisie reste à l'écran, il suffit de le renvoyer au retour du réseau.
 * Les rechargements silencieux (mise à jour automatique) échouent sans message : la bannière
 * de connexion suffit. Les écrans de l'hôtesse qui savent travailler hors ligne gèrent eux-mêmes
 * l'absence de réseau (onNetworkError) et ne passent pas par ici.
 */
export function setupNetworkErrors(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const active = new Map<string, StartedVisit>();

    router.on('start', ({ detail: { visit } }) => {
        active.set(visit.id, {
            url: visit.url,
            method: visit.method,
            async: visit.async,
        });
    });
    router.on('finish', ({ detail: { visit } }) => {
        active.delete(visit.id);
    });

    router.on('networkError', (event) => {
        // Traité ici : pas d'erreur non interceptée dans la console
        event.preventDefault();
        markUnstable();

        const visit = [...active.values()].reverse().find((v) => !v.async);
        if (!visit) return;

        const offline = !navigator.onLine;
        const title = offline
            ? 'Vous n’êtes pas connecté'
            : 'Connexion trop faible';

        if (visit.method.toLowerCase() !== 'get') {
            toast.error(`${title} · rien n’a été envoyé`, {
                id: 'reseau',
                description:
                    'Votre saisie reste à l’écran : renvoyez-la dès que le réseau revient.',
                duration: 8000,
            });
            return;
        }

        const href = `${visit.url.pathname}${visit.url.search}`;
        toast.error(title, {
            id: 'reseau',
            description:
                'Cette page n’a pas pu s’ouvrir. Vérifiez votre connexion, puis réessayez.',
            duration: 8000,
            action: { label: 'Réessayer', onClick: () => router.visit(href) },
        });
    });
}
