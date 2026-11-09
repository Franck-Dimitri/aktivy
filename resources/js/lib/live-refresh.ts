import { router } from '@inertiajs/react';
import { pulse } from '@/routes/notifications';

/*
 * Écran à jour sans recharger la page.
 *
 * Pas de serveur temps réel : l'application prend le « pouls » du compte (dernière notification,
 * nombre de non lues) toutes les 20 secondes, seulement quand l'écran est visible et en ligne.
 * Dès qu'il change (nouvelle notification, notification lue sur un autre appareil), la page recharge
 * ses données en silence : sans barre de chargement, sans perdre la position ni la saisie en cours.
 * Une notification push reçue par l'appareil déclenche la mise à jour tout de suite (cf. sw.js).
 */

const INTERVAL_MS = 20_000;

/** Signature du dernier pouls connu ; null = à relever (après un changement de page). */
let signature: string | null = null;
let loggedIn = false;
/** Envoi en cours (formulaire, changement de page) : on ne recharge pas par-dessus. */
let busy = 0;
let checking = false;

function canRefresh(): boolean {
    return loggedIn && busy === 0 && document.visibilityState === 'visible' && navigator.onLine;
}

/** Recharge silencieuse des données de la page affichée. */
function refresh(): void {
    if (!canRefresh()) {
        signature = null; // à relever au prochain passage : la mise à jour se fera à ce moment-là
        return;
    }

    // router.reload garde d'office la position et l'état de la page (saisie en cours comprise)
    router.reload({ async: true, showProgress: false, preserveErrors: true });
}

async function check(): Promise<void> {
    if (!canRefresh() || checking) {
        return;
    }

    checking = true;
    try {
        const response = await fetch(pulse().url, {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });

        // Session expirée, compte en attente… : la prochaine navigation s'en chargera
        if (!response.ok || response.redirected) {
            return;
        }

        const data = (await response.json()) as { latest: string | null; unread: number };
        const next = `${data.latest ?? ''}|${data.unread}`;

        if (signature !== null && next !== signature) {
            refresh();
        }
        signature = next;
    } catch {
        // Réseau coupé : nouvel essai au prochain tour
    } finally {
        checking = false;
    }
}

export function setupLiveRefresh(): void {
    if (typeof window === 'undefined') {
        return;
    }

    // Chaque page affichée (navigation ou rechargement) porte des données fraîches : on relève le pouls
    router.on('navigate', (event) => {
        const props = event.detail.page.props as { auth?: { user?: unknown } };
        loggedIn = Boolean(props.auth?.user);
        signature = null;
        void check();
    });

    // Les rechargements silencieux (async) ne bloquent rien ; les envois de l'utilisateur, si
    router.on('start', (event) => {
        if (!event.detail.visit.async) busy++;
    });
    router.on('finish', (event) => {
        if (!event.detail.visit.async) busy = Math.max(0, busy - 1);
        // Page affichée pendant l'envoi : le pouls n'a pas pu être relevé, on le fait maintenant
        if (signature === null) void check();
    });

    window.setInterval(() => void check(), INTERVAL_MS);

    // Retour sur l'application (onglet, téléphone déverrouillé) ou retour du réseau : tout de suite
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void check();
    });
    window.addEventListener('online', () => void check());

    // Notification push reçue par l'appareil : la notification est peut-être encore en cours
    // d'enregistrement, on recharge donc directement plutôt que de comparer le pouls
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
            if (event.data?.type === 'push-received') {
                window.setTimeout(refresh, 1500);
            }
        });
    }
}
