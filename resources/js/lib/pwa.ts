/**
 * Application installable (PWA) et notifications push : détection de l'appareil, invitation à
 * installer (Android : beforeinstallprompt ; iPhone : étapes Safari), abonnement WebPush.
 */

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

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

export function onInstallChange(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// ── Appareil ────────────────────────────────────────────────────────────

/** iPhone, iPod, et iPad (iPadOS se présente comme un Mac tactile). */
export function isIOS(): boolean {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
    return isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV/i.test(navigator.userAgent);
}

/** Lancée depuis l'écran d'accueil (application installée). */
export function isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
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
const snooze = (key: string) => store(key, String(Date.now() + SNOOZE_DAYS * 86_400_000));

export const installSnoozed = () => snoozed(INSTALL_KEY) || read(INSTALLED_KEY) === '1';
export const snoozeInstall = () => snooze(INSTALL_KEY);
export const pushSnoozed = () => snoozed(PUSH_KEY);
export const snoozePush = () => snooze(PUSH_KEY);

// ── Notifications push ─────────────────────────────────────────────────

export function pushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export type PushState = 'unsupported' | 'denied' | 'enabled' | 'available';

export async function pushState(): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription && Notification.permission === 'granted' ? 'enabled' : 'available';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function xsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function send(method: 'POST' | 'DELETE', body: unknown): Promise<void> {
    const res = await fetch('/push/abonnement', {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf(), 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
}

/**
 * Active les notifications sur cet appareil. Doit être appelé depuis un clic (exigence d'iOS).
 * Renvoie l'état obtenu : « denied » si l'utilisateur refuse dans la fenêtre du système.
 */
export async function enablePush(publicKey: string): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'available';

    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource }));

    const json = subscription.toJSON();
    await send('POST', { endpoint: json.endpoint, keys: json.keys, contentEncoding: (PushManager as unknown as { supportedContentEncodings?: string[] }).supportedContentEncodings?.[0] ?? 'aes128gcm' });

    return 'enabled';
}

export async function disablePush(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
        await send('DELETE', { endpoint: subscription.endpoint }).catch(() => {});
        await subscription.unsubscribe();
    }
}
