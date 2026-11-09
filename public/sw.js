/*
 * Service Worker Motriks : l'espace hôtesse s'ouvre et reste utilisable sans réseau.
 *
 * - Fichiers de l'application (/build) : servis depuis le cache, ils portent une empreinte.
 * - Pages /terrain : réseau d'abord, dernière version connue si le réseau manque.
 * - Rien d'autre n'est conservé : les pages responsable et les envois restent en direct.
 *
 * Les pages contiennent des données personnelles : l'application demande leur effacement
 * à la déconnexion ou au changement de compte (message « clear-pages »).
 */
const ASSETS = 'motriks-assets-v1';
const PAGES = 'motriks-pages-v1';
const KNOWN = [ASSETS, PAGES];
const OFFLINE_PAGE = '/offline.html';

/** Au-delà de ce délai sur un réseau faible, on sert la dernière version connue. */
const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(ASSETS)
            .then((cache) => cache.add(OFFLINE_PAGE))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => !KNOWN.includes(key)).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'clear-pages') {
        event.waitUntil(caches.delete(PAGES));
    }
    if (event.data?.type === 'cache-page') {
        event.waitUntil(cachePage(event.data.url));
    }
    if (event.data?.type === 'sync-assets') {
        event.waitUntil(syncAssets());
    }
});

/*
 * Notifications push (WebPush) : chaque notification porte un titre, un texte court et l'adresse
 * de la page concernée. Un toucher ouvre cette page, dans la fenêtre Motriks déjà ouverte s'il y en a une.
 */
self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = { title: 'Motriks', body: event.data?.text() ?? '' };
    }

    const title = payload.title || 'Motriks';
    event.waitUntil(
        Promise.all([
            self.registration.showNotification(title, {
                body: payload.body || '',
                icon: payload.icon || '/icon-192.png',
                badge: payload.badge || '/badge-96.png',
                lang: payload.lang || 'fr',
                tag: payload.tag,
                renotify: Boolean(payload.tag),
                data: { url: payload.data?.url || '/' },
            }),
            // Fenêtres Motriks ouvertes : elles mettent leurs données à jour (cf. resources/js/lib/live-refresh.ts)
            self.clients.matchAll({ type: 'window' }).then((windows) => windows.forEach((w) => w.postMessage({ type: 'push-received' }))),
        ]),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
            if (open) {
                return open.focus().then((w) => (w && 'navigate' in w ? w.navigate(target) : undefined));
            }
            return self.clients.openWindow(target);
        }),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (url.pathname.startsWith('/build/')) {
        event.respondWith(cacheFirst(request));

        return;
    }

    const isInertia = request.headers.has('X-Inertia');
    const isTerrain = url.pathname === '/terrain' || url.pathname.startsWith('/terrain/');

    // Rechargement partiel : réponse incomplète, à ne pas garder comme page
    if (isTerrain && (request.mode === 'navigate' || (isInertia && !request.headers.has('X-Inertia-Partial-Component')))) {
        event.respondWith(networkFirst(request, url, isInertia));

        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_PAGE)));
    }
});

/**
 * Garde la page complète : une navigation dans l'application ne charge que ses données,
 * or c'est la page complète qu'il faut pour rouvrir l'application sans réseau.
 */
async function cachePage(path) {
    const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'text/html' } });

    if (response.ok && !response.redirected) {
        const cache = await caches.open(PAGES);
        await cache.put(path, response);
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        const cache = await caches.open(ASSETS);
        await cache.put(request, response.clone());
    }

    return response;
}

async function networkFirst(request, url, isInertia) {
    const cache = await caches.open(PAGES);
    // Une même adresse existe en page complète et en réponse Inertia : deux entrées distinctes
    const key = isInertia ? `${url.pathname}${url.search}#inertia`.replace('#', url.search ? '&_i=' : '?_i=') : `${url.pathname}${url.search}`;

    const network = fetch(request).then((response) => {
        // Une redirection (session expirée vers la connexion) n'est pas la page demandée
        if (response.ok && !response.redirected && response.type === 'basic') {
            cache.put(key, response.clone());
        }

        return response;
    });

    try {
        const first = await Promise.race([network, new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, 'timeout'))]);

        if (first !== 'timeout') {
            return first;
        }

        network.catch(() => {});

        return (await cache.match(key)) ?? (await network);
    } catch (error) {
        const cached = await cache.match(key);

        if (cached) {
            return cached;
        }

        if (request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
        }

        throw error;
    }
}

/**
 * Met en cache d'avance ce qu'il faut pour ouvrir l'espace hôtesse hors ligne, et retire
 * les fichiers des versions précédentes. La liste vient du manifeste de la compilation.
 */
async function syncAssets() {
    const response = await fetch('/build/manifest.json', { cache: 'reload' });

    if (!response.ok) {
        return;
    }

    const manifest = await response.json();
    const wanted = new Set();
    const collect = (key) => {
        const entry = manifest[key];

        if (!entry || wanted.has(`/build/${entry.file}`)) {
            return;
        }

        wanted.add(`/build/${entry.file}`);
        (entry.css ?? []).forEach((file) => wanted.add(`/build/${file}`));
        (entry.assets ?? []).forEach((file) => wanted.add(`/build/${file}`));
        (entry.imports ?? []).forEach(collect);
    };

    Object.keys(manifest)
        .filter((key) => manifest[key].isEntry || key.includes('/pages/terrain/'))
        .forEach(collect);

    const cache = await caches.open(ASSETS);
    await Promise.allSettled([...wanted].map(async (path) => {
        if (!(await cache.match(path))) {
            await cache.add(path);
        }
    }));

    const current = new Set(Object.values(manifest).flatMap((e) => [e.file, ...(e.css ?? []), ...(e.assets ?? [])]).map((file) => `/build/${file}`));

    for (const request of await cache.keys()) {
        const path = new URL(request.url).pathname;

        if (path.startsWith('/build/') && !current.has(path)) {
            await cache.delete(request);
        }
    }
}
