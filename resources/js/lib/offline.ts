import { router } from '@inertiajs/react';

const USER_KEY = 'motriks:utilisateur';

/** Rapport soumis sans réseau : il part tout seul au retour de la connexion. */
export type QueuedReport = {
    reportId: number;
    userId: number;
    url: string;
    payload: Record<string, unknown>;
    siteName: string;
};

const QUEUE_KEY = 'motriks:rapports-a-envoyer';

// Le stockage peut être indisponible (navigation privée, mémoire pleine) : la page fonctionne sans
export function queuedReports(): QueuedReport[] {
    try {
        return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedReport[];
    } catch {
        return [];
    }
}

function saveQueue(items: QueuedReport[]) {
    try {
        window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    } catch {
        // stockage indisponible : le rapport reste à l'écran
    }
}

export function queueReport(item: QueuedReport) {
    saveQueue([...queuedReports().filter((q) => q.reportId !== item.reportId), item]);
}

export function unqueueReport(reportId: number) {
    saveQueue(queuedReports().filter((q) => q.reportId !== reportId));
}

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
