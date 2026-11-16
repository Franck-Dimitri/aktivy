import { isStandalone } from '@/lib/pwa';

/**
 * Application installée sur téléphone : un appui long sur un bouton, un lien ou une image n'ouvre
 * plus le menu du navigateur (« Ouvrir dans un onglet », « Enregistrer l'image »…), qui trahit le
 * site web. Les champs de saisie gardent leur menu (copier, coller). Sur ordinateur, rien ne change.
 * Le reste (reflet gris au toucher, double toucher qui zoome, élastique de la page) est réglé
 * dans resources/css/app.css.
 */
export function setupAppFeel(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const touch = window.matchMedia('(pointer: coarse)');

    document.addEventListener('contextmenu', (event) => {
        if (
            !touch.matches ||
            !isStandalone() ||
            !(event.target instanceof Element)
        ) {
            return;
        }

        const target = event.target;
        if (
            target.closest(
                'input, textarea, select, [contenteditable="true"], [data-menu-natif]',
            )
        ) {
            return;
        }

        if (
            target.closest(
                'a, button, img, svg, label, [role="button"], [role="tab"], [role="menuitem"], nav',
            )
        ) {
            event.preventDefault();
        }
    });
}
