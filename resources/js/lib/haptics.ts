/**
 * Petite vibration de confirmation, comme dans une application mobile (Android ; l'iPhone ne la permet
 * pas aux applications web et l'ignore). Réservée aux moments qui comptent : service pris ou terminé,
 * rapport soumis, actualisation déclenchée. Rien si la personne a demandé moins d'animations.
 */

const PATTERNS = {
    /** Un seuil franchi (tirer pour actualiser). */
    light: 10,
    /** Une action importante réussie. */
    success: [14, 70, 22],
    /** Une action impossible (pas de réseau…). */
    warning: [40, 60, 40],
} satisfies Record<string, number | number[]>;

export type Haptic = keyof typeof PATTERNS;

export function haptic(kind: Haptic = 'light'): void {
    if (
        typeof navigator === 'undefined' ||
        typeof navigator.vibrate !== 'function'
    ) {
        return;
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    try {
        navigator.vibrate(PATTERNS[kind]);
    } catch {
        // Refusé (aucun geste récent de l'utilisateur) : sans conséquence
    }
}
