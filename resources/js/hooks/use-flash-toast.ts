import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

/** Laisse aux callbacks onSuccess de la visite (et au <Toaster>) le temps de se mettre en place. */
const SETTLE_MS = 80;

let installed = false;

/**
 * Toasts envoyés par le serveur : Inertia::flash('toast'), App\Support\Toast, ou `->with('success', '…')`
 * converti par HandleInertiaRequests.
 *
 * Installé une fois, avant le démarrage d'Inertia : au premier chargement d'une page (lien reçu par
 * e-mail, retour de connexion…), l'événement « flash » part avant que React n'ait monté ses effets.
 *
 * Beaucoup d'écrans affichent déjà leur propre toast, plus précis, dans onSuccess : dans ce cas le
 * message du serveur n'est pas répété (on compare l'historique des toasts depuis le début de la visite).
 */
export function setupFlashToasts(): void {
    if (installed || typeof window === 'undefined') {
        return;
    }
    installed = true;

    let atVisitStart = toast.getHistory().length;

    router.on('start', () => {
        atVisitStart = toast.getHistory().length;
    });

    router.on('flash', (event) => {
        const data = (event as CustomEvent).detail?.flash?.toast as FlashToast | undefined;

        if (!data?.message) {
            return;
        }

        window.setTimeout(() => {
            if (toast.getHistory().length > atVisitStart) {
                return;
            }

            (toast[data.type] ?? toast.success)(data.message);
        }, SETTLE_MS);
    });
}
