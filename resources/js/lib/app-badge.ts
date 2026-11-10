/*
 * Pastille sur l'icône de l'application installée : le nombre de notifications non lues,
 * comme les applications mobiles. Rien ne s'affiche sur un appareil qui ne le permet pas
 * (le navigateur ignore simplement l'appel).
 *
 * - iPhone / iPad (iOS 16.4 et plus) : application ajoutée à l'écran d'accueil, notifications autorisées.
 * - Ordinateur (Chrome, Edge) : application installée.
 * - Android : le téléphone affiche lui-même un point ou un nombre sur l'icône à partir des
 *   notifications reçues (selon le téléphone) ; l'API n'y est pas prise en charge.
 */

type BadgeNavigator = Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
};

let last: number | null = null;

export function setAppBadge(count: number): void {
    if (typeof navigator === 'undefined' || count === last) {
        return;
    }

    const nav = navigator as BadgeNavigator;
    if (!nav.setAppBadge || !nav.clearAppBadge) {
        return;
    }

    last = count;
    const done = count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge();
    // Refus (application non installée, permission absente) : sans conséquence
    done.catch(() => {
        last = null;
    });
}
