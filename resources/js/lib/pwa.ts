/**
 * Application installable (PWA) et notifications push : détection de l'appareil, invitation à
 * installer (Android : beforeinstallprompt ; iPhone : étapes Safari), abonnement WebPush.
 */

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const SNOOZE_DAYS = 7;
const INSTALL_KEY = 'motriks:install-snoozed-until';
const PUSH_KEY = 'motriks:push-snoozed-until';
const INSTALLED_KEY = 'motriks:installed';

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** À appeler au démarrage : Android ne propose l'invitation qu'une fois, il faut la garder de côté. */
export function setupInstallCapture(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e as BeforeInstallPromptEvent;
        notify();
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        store(INSTALLED_KEY, '1');
        notify();
    });
}

/**
 * Application déjà ouverte et icône touchée à nouveau (manifeste : launch_handler « focus-existing ») :
 * la fenêtre revient au premier plan telle qu'on l'a laissée, saisie en cours comprise. Seul un
 * raccourci de l'icône (« /app?ouvrir=… », appui long) change d'écran.
 * Le tout premier lancement a déjà ouvert la bonne page (redirection du serveur) : il est ignoré.
 */
export function setupLaunchQueue(navigate: (url: string) => void): void {
    type LaunchQueue = {
        setConsumer: (
            consumer: (params: { targetURL?: string }) => void,
        ) => void;
    };
    const queue =
        typeof window === 'undefined'
            ? undefined
            : (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
    if (!queue) return;

    const loadedAt = Date.now();
    queue.setConsumer(({ targetURL }) => {
        if (!targetURL || Date.now() - loadedAt < 3000) return;
        const url = new URL(targetURL);
        if (
            url.origin === window.location.origin &&
            url.searchParams.has('ouvrir')
        ) {
            navigate(`${url.pathname}${url.search}`);
        }
    });
}

export function onInstallChange(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// ── Appareil ────────────────────────────────────────────────────────────

/** iPhone, iPod, et iPad (iPadOS se présente comme un Mac tactile). */
export function isIOS(): boolean {
    const ua = navigator.userAgent;
    return (
        /iPhone|iPad|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
}

export function isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
}

/** Téléphone ou tablette : l'invitation n'est jamais proposée sur ordinateur. */
export function isMobileDevice(): boolean {
    return isIOS() || isAndroid();
}

/** Safari sur iOS (Chrome, Firefox, Edge… sur iPhone ne permettent pas l'ajout à l'écran d'accueil de la même façon). */
export function isIOSSafari(): boolean {
    return (
        isIOS() &&
        !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV/i.test(
            navigator.userAgent,
        )
    );
}

/** Lancée depuis l'écran d'accueil (application installée). */
export function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export function canPromptInstall(): boolean {
    return deferred !== null;
}

/** Android : ouvre la fenêtre d'installation du système. */
export async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;
    const event = deferred;
    deferred = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    notify();
    return outcome === 'accepted';
}

// ── « Pas maintenant » : 7 jours ─────────────────────────────────────────

function store(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // navigation privée : on redemandera simplement à la prochaine visite
    }
}

function read(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

const snoozed = (key: string) => Number(read(key) ?? 0) > Date.now();
const snooze = (key: string) =>
    store(key, String(Date.now() + SNOOZE_DAYS * 86_400_000));

export const installSnoozed = () =>
    snoozed(INSTALL_KEY) || read(INSTALLED_KEY) === '1';
export const snoozeInstall = () => snooze(INSTALL_KEY);
export const pushSnoozed = () => snoozed(PUSH_KEY);
export const snoozePush = () => snooze(PUSH_KEY);

// ── Notifications push ─────────────────────────────────────────────────

export function pushSupported(): boolean {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export type PushState = 'unsupported' | 'denied' | 'enabled' | 'available';

export async function pushState(): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription && Notification.permission === 'granted'
        ? 'enabled'
        : 'available';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from({ length: raw.length }, (_, i) => raw.charCodeAt(i));
}

function xsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function send(method: 'POST' | 'DELETE', body: unknown): Promise<void> {
    const res = await fetch('/push/abonnement', {
        method,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrf(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
}

// ── Cet appareil, côté serveur ─────────────────────────────────────────

/** Adresse d'abonnement de ce navigateur, lue par le serveur à la déconnexion (App\Listeners\ForgetPushDevice). */
const DEVICE_COOKIE = 'motriks_appareil';
/** Dernier envoi de l'abonnement au serveur : { user, endpoint, at }. */
const SYNC_KEY = 'motriks:push-sync';
/** Notifications coupées par l'utilisateur sur cet appareil : on ne les réactive jamais de soi-même. */
const OFF_KEY = 'motriks:push-off';
/** Renvoi régulier, même sans changement : le serveur a pu effacer l'abonnement (expiré, autre compte…). */
const SYNC_EVERY_MS = 12 * 60 * 60 * 1000;

function rememberDevice(endpoint: string | null): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = endpoint
        ? `${DEVICE_COOKIE}=${encodeURIComponent(endpoint)}; path=/; max-age=31536000; SameSite=Lax${secure}`
        : `${DEVICE_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

function sameKey(current: ArrayBuffer | null, wanted: Uint8Array): boolean {
    if (!current) return false;
    const bytes = new Uint8Array(current);
    return (
        bytes.length === wanted.length && bytes.every((b, i) => b === wanted[i])
    );
}

/** Envoie l'abonnement de cet appareil au serveur, pour le compte connecté. */
async function register(
    subscription: PushSubscription,
    userId: number | null,
): Promise<void> {
    const json = subscription.toJSON();
    await send('POST', {
        endpoint: json.endpoint,
        keys: json.keys,
        contentEncoding:
            (PushManager as unknown as { supportedContentEncodings?: string[] })
                .supportedContentEncodings?.[0] ?? 'aes128gcm',
    });
    rememberDevice(subscription.endpoint);
    store(
        SYNC_KEY,
        JSON.stringify({
            user: userId,
            endpoint: subscription.endpoint,
            at: Date.now(),
        }),
    );
}

/**
 * Active les notifications sur cet appareil. Doit être appelé depuis un clic (exigence d'iOS).
 * Renvoie l'état obtenu : « denied » si l'utilisateur refuse dans la fenêtre du système.
 */
export async function enablePush(
    publicKey: string,
    userId: number | null = null,
): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted')
        return permission === 'denied' ? 'denied' : 'available';

    const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                publicKey,
            ) as BufferSource,
        }));

    try {
        window.localStorage.removeItem(OFF_KEY);
    } catch {
        // navigation privée
    }
    await register(subscription, userId);

    return 'enabled';
}

export async function disablePush(): Promise<void> {
    store(OFF_KEY, '1');
    rememberDevice(null);
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
        await send('DELETE', { endpoint: subscription.endpoint }).catch(
            () => {},
        );
        await subscription.unsubscribe();
    }
}

/**
 * Garde les notifications vivantes sans rien demander à la personne (autorisation déjà donnée) :
 * - le navigateur a renouvelé l'abonnement (il expire de lui-même) : le nouveau part au serveur ;
 * - le serveur l'a effacé (abonnement expiré, déconnexion) : il est renvoyé ;
 * - un autre compte s'est connecté sur ce téléphone : l'appareil passe à ce compte ;
 * - les clés du serveur ont changé : réabonnement avec les nouvelles.
 * Sinon, un simple renvoi toutes les 12 heures. Rien si la personne a coupé les notifications.
 */
async function syncPush(
    publicKey: string,
    userId: number,
    force: boolean,
): Promise<void> {
    if (
        !pushSupported() ||
        Notification.permission !== 'granted' ||
        read(OFF_KEY) === '1'
    )
        return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const key = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (
        subscription &&
        !sameKey(subscription.options.applicationServerKey, key)
    ) {
        await subscription.unsubscribe();
        subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
    });

    let last: { user?: number; endpoint?: string; at?: number } = {};
    try {
        last = JSON.parse(read(SYNC_KEY) ?? '{}');
    } catch {
        // valeur abîmée : on renvoie
    }
    const fresh =
        last.user === userId &&
        last.endpoint === subscription.endpoint &&
        Date.now() - (last.at ?? 0) < SYNC_EVERY_MS;
    if (fresh && !force) return;

    await register(subscription, userId);
}

type PushAccount = { userId: number | null; publicKey: string | null };

/**
 * À appeler au démarrage avec le compte affiché ; renvoie la fonction à appeler à chaque page affichée.
 * Vérifie aussi à chaque retour dans l'application et au retour du réseau (au plus une fois par minute),
 * et tout de suite quand le Service Worker signale un abonnement renouvelé (sw.js, pushsubscriptionchange).
 */
export function setupPushSync(): (account: PushAccount) => void {
    let account: PushAccount = { userId: null, publicKey: null };
    if (typeof window === 'undefined' || !pushSupported()) return () => {};

    let lastCheck = 0;
    const check = (force = false) => {
        const { userId, publicKey } = account;
        if (!userId || !publicKey || !navigator.onLine) return;
        if (!force && Date.now() - lastCheck < 60_000) return;
        lastCheck = Date.now();
        void syncPush(publicKey, userId, force).catch(() => {
            // réseau ou navigateur récalcitrant : nouvel essai à la prochaine occasion
            lastCheck = 0;
        });
    };

    document.addEventListener(
        'visibilitychange',
        () => document.visibilityState === 'visible' && check(),
    );
    window.addEventListener('online', () => check());
    navigator.serviceWorker.addEventListener(
        'message',
        (event: MessageEvent<{ type?: string }>) => {
            if (event.data?.type === 'push-resubscribed') check(true);
        },
    );

    return (next) => {
        // Déconnecté : le serveur vient de retirer cet appareil (ForgetPushDevice), à renvoyer à la prochaine connexion
        if (next.userId === null) {
            try {
                window.localStorage.removeItem(SYNC_KEY);
            } catch {
                // navigation privée
            }
        }
        // Changement de compte sans rechargement : tout de suite, sans attendre la minute
        const switched =
            account.userId !== null && next.userId !== account.userId;
        account = next;
        check(switched);
    };
}
