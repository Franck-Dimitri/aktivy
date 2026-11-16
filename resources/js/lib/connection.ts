import { router } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { pulse } from '@/routes/notifications';

/**
 * État de la connexion, partagé par toute l'application.
 *
 * - « online » : tout va bien ;
 * - « offline » : le téléphone n'a plus de réseau (le système le dit) ;
 * - « unstable » : le système dit qu'il y a du réseau, mais une page n'a pas pu se charger
 *   (réseau trop faible, Wi-Fi sans Internet…). Repasse à « online » à la première réponse reçue.
 *
 * « updatedAt » : heure des données affichées (dernière réponse du serveur), pour dire à la personne
 * de quand datent les chiffres qu'elle voit quand le réseau manque.
 */
export type ConnectionStatus = 'online' | 'offline' | 'unstable';

export type Connection = {
    status: ConnectionStatus;
    updatedAt: number;
    /** Vient de revenir en ligne (pour un court message « Connexion rétablie »). */
    restoredAt: number | null;
};

let state: Connection = {
    status:
        typeof navigator === 'undefined' || navigator.onLine
            ? 'online'
            : 'offline',
    updatedAt: Date.now(),
    restoredAt: null,
};
const listeners = new Set<() => void>();

function set(next: Partial<Connection>): void {
    // De nouveau en ligne : le message « pas connecté » d'une page qui n'a pas pu s'ouvrir n'a plus lieu d'être
    if (next.status === 'online' && state.status !== 'online')
        toast.dismiss('reseau');
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
}

function goOnline(): void {
    if (state.status === 'online') return;
    set({ status: 'online', restoredAt: Date.now() });
    // Les données affichées datent d'avant la coupure : mise à jour en silence, saisie en cours gardée
    router.reload({ async: true, showProgress: false } as never);
}

export function connection(): Connection {
    return state;
}

export function useConnection(): Connection {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state,
        () => state,
    );
}

/** Une page n'a pas pu se charger alors que le système annonce du réseau. */
export function markUnstable(): void {
    set({ status: navigator.onLine ? 'unstable' : 'offline' });
}

/**
 * « Réessayer » : petite requête au serveur. Si elle passe, on est de nouveau en ligne
 * (et la page se met à jour) ; sinon l'état ne change pas.
 */
export async function checkConnection(): Promise<boolean> {
    try {
        const response = await fetch(pulse().url, {
            credentials: 'same-origin',
            cache: 'no-store',
            // Une réponse, même une redirection, prouve que le réseau répond : inutile (et risqué) de la suivre
            redirect: 'manual',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        if (response.ok || response.status < 500) {
            goOnline();
            return true;
        }
    } catch {
        // toujours pas de réseau
    }
    markUnstable();
    return false;
}

export function setupConnection(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.addEventListener('offline', () =>
        set({ status: 'offline', restoredAt: null }),
    );
    // Le système annonce le retour du réseau : on vérifie qu'Internet répond vraiment
    window.addEventListener('online', () => void checkConnection());

    // Connexion instable : on revérifie de temps en temps, écran visible (sans réseau du tout, on attend « online »)
    window.setInterval(() => {
        if (
            state.status === 'unstable' &&
            navigator.onLine &&
            document.visibilityState === 'visible'
        ) {
            void checkConnection();
        }
    }, 15_000);

    // Toute réponse du serveur prouve la connexion et date les données affichées
    router.on('success', () => {
        if (state.status !== 'online') {
            set({
                status: 'online',
                restoredAt: Date.now(),
                updatedAt: Date.now(),
            });
        } else {
            set({ updatedAt: Date.now() });
        }
    });
}
