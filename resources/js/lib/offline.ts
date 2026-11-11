import { router } from '@inertiajs/react';

const USER_KEY = 'motriks:utilisateur';

// Les actions faites sans réseau attendent dans lib/outbox.ts et partent avec lib/sync.ts

/**
 * Active le Service Worker et efface les pages gardées dès que le compte change :
 * sur un téléphone partagé, l'hôtesse suivante ne doit pas voir les données de la précédente.
 */
export function setupOffline() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) {
        return;
    }

    const post = (message: { type: string }) => navigator.serviceWorker.ready.then((sw) => sw.active?.postMessage(message));

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(() => post({ type: 'sync-assets' }))
            .catch(() => {
                // sans Service Worker, l'application fonctionne simplement en ligne
            });
    });

    /*
     * Mise à jour en arrière-plan : une application installée reste souvent ouverte des jours sans être
     * rechargée. À chaque retour au premier plan (au plus une fois par heure), on vérifie s'il existe une
     * nouvelle version du Service Worker (installée et activée d'elle-même, cf. skipWaiting dans sw.js).
     * Rien n'est affiché : l'écran passe sur la nouvelle version au prochain changement de page (version
     * Inertia), et c'est ce rechargement qui met à jour le cache hors-ligne. Le cache n'est pas resynchronisé
     * ici : les pages gardées hors-ligne pointent encore vers les fichiers de l'ancienne version.
     */
    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine || Date.now() - lastCheck < 60 * 60 * 1000) {
            return;
        }
        lastCheck = Date.now();

        navigator.serviceWorker
            .getRegistration()
            .then((registration) => registration?.update())
            .catch(() => {
                // réseau coupé entre-temps : nouvel essai au prochain retour
            });
    });

    router.on('navigate', (event) => {
        const props = event.detail.page.props as { auth?: { user?: { id: number } | null } };
        const userId = String(props.auth?.user?.id ?? '');
        const { pathname, search } = new URL(event.detail.page.url, window.location.origin);

        try {
            if (window.localStorage.getItem(USER_KEY) !== userId) {
                window.localStorage.setItem(USER_KEY, userId);
                post({ type: 'clear-pages' });
            }
        } catch {
            post({ type: 'clear-pages' });
        }

        if (navigator.onLine && (pathname === '/terrain' || pathname.startsWith('/terrain/'))) {
            navigator.serviceWorker.ready.then((sw) => sw.active?.postMessage({ type: 'cache-page', url: `${pathname}${search}` }));
        }
    });
}
