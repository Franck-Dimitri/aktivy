/**
 * Bouton Retour d'Android : il ferme d'abord ce qui est ouvert par-dessus la page (fenêtre, menu
 * déroulant, menu latéral, liste des notifications), comme dans une application, au lieu de quitter
 * la page avec la fenêtre encore ouverte.
 *
 * S'appuie sur CloseWatcher (Chrome 120 et plus, donc l'application installée sur Android) : le système
 * prévient la page sans toucher à l'historique, la navigation d'Inertia n'est pas dérangée. Ailleurs
 * (iPhone, ordinateur, ancien Chrome), rien ne change : Échap et les boutons de fermeture suffisent.
 *
 * Chaque surcouche ouverte (role « dialog », « alertdialog » ou « menu ») reçoit son veilleur ; la
 * dernière ouverte est fermée en premier. La fermeture passe par un appui simulé sur Échap, que toutes
 * les surcouches de l'application écoutent déjà (Radix, <Modal>, cloche des notifications).
 */

type CloseWatcherLike = {
    onclose: ((event: Event) => void) | null;
    destroy: () => void;
};
type CloseWatcherConstructor = new () => CloseWatcherLike;

/** Les listes (role="listbox") n'en font pas partie : certaines sont posées dans la page, pas par-dessus. */
const OVERLAYS = '[role="dialog"], [role="alertdialog"], [role="menu"]';

const isOpen = (element: Element) =>
    element.isConnected && element.getAttribute('data-state') !== 'closed';

function dismiss(overlay: Element): void {
    const focused = document.activeElement;
    const target = focused && overlay.contains(focused) ? focused : overlay;
    target.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true,
        }),
    );
}

export function setupBackButton(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const CloseWatcher = (
        window as Window & { CloseWatcher?: CloseWatcherConstructor }
    ).CloseWatcher;
    if (!CloseWatcher || !document.body) {
        return;
    }

    const watchers = new Map<Element, CloseWatcherLike>();

    const sync = () => {
        for (const [overlay, watcher] of watchers) {
            if (!isOpen(overlay)) {
                watchers.delete(overlay);
                watcher.destroy();
            }
        }

        document.querySelectorAll(OVERLAYS).forEach((overlay) => {
            if (watchers.has(overlay) || !isOpen(overlay)) {
                return;
            }

            try {
                const watcher = new CloseWatcher();
                watcher.onclose = () => {
                    watchers.delete(overlay);
                    dismiss(overlay);
                };
                watchers.set(overlay, watcher);
            } catch {
                // Refusé par le navigateur : le bouton Retour garde son comportement habituel
            }
        });
    };

    new MutationObserver(sync).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-state', 'role'],
    });
}
