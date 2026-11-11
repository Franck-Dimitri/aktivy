import { useSyncExternalStore } from 'react';
import {
    deleteLocalVisit,
    localVisits,
    moveVisit,
    operations,
    outboxAvailable,
    removeOperation,
    updateLocalVisit,
    type OutboxKind,
    type OutboxOperation,
} from '@/lib/outbox';

/**
 * Envoi de la file hors ligne (resources/js/lib/outbox.ts), une action après l'autre, dans l'ordre.
 *
 * Une action ne quitte le téléphone que quand le serveur confirme l'avoir enregistrée (JSON « ok »,
 * cf. App\Http\Middleware\HandleBackgroundSync), ou quand il la refuse pour de bon (valeur refusée,
 * visite inconnue). Coupure, réseau trop lent, erreur du serveur : elle reste et repart plus tard.
 * Session expirée : elle attend que l'hôtesse se reconnecte.
 */

export type SyncBlock = 'auth' | 'action' | null;

export type Rejection = { kind: OutboxKind; siteName: string; message: string };

export type SyncState = {
    online: boolean;
    pending: OutboxOperation[];
    syncing: boolean;
    blocked: SyncBlock;
    /** Prochain essai après un échec réseau (horodatage), null si rien n'est prévu */
    retryAt: number | null;
};

let state: SyncState = {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending: [],
    syncing: false,
    blocked: null,
    retryAt: null,
};
const listeners = new Set<() => void>();

function setState(changes: Partial<SyncState>) {
    state = { ...state, ...changes };
    listeners.forEach((l) => l());
}

export function syncState(): SyncState {
    return state;
}

/** État de la file pour l'affichage (bandeau, accueil, rapport). */
export function useSyncState(): SyncState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        () => state,
        () => state,
    );
}

export function setOnline(online: boolean) {
    setState({ online });
}

/** Relit la file sur le téléphone (après un ajout ou un envoi). */
export async function refreshPending(userId: number | undefined): Promise<OutboxOperation[]> {
    if (!userId || !outboxAvailable()) return [];

    const pending = await operations(userId).catch(() => []);
    setState({ pending });

    return pending;
}

/* ─── Envoi ─── */

type Outcome =
    | { type: 'done'; visit?: string }
    | { type: 'rejected'; message: string }
    | { type: 'auth' }
    | { type: 'action' }
    | { type: 'network' };

function xsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/** Jeton anti-falsification périmé (page restée ouverte longtemps) : n'importe quelle page en donne un neuf. */
async function refreshToken() {
    await fetch('/app', { credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }).catch(() => undefined);
}

function messageOf(json: unknown, fallback: string): string {
    const data = json as { message?: string; errors?: Record<string, string[] | string> } | null;
    const first = data?.errors ? Object.values(data.errors)[0] : undefined;

    return (Array.isArray(first) ? first[0] : first) ?? data?.message ?? fallback;
}

async function send(op: OutboxOperation, retried = false): Promise<Outcome> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Motriks-Sync': '1',
        'X-XSRF-TOKEN': xsrf(),
    };
    let body: BodyInit;
    let method = op.method.toUpperCase();

    if (op.blob) {
        const form = new FormData();
        Object.entries(op.body).forEach(([key, value]) => {
            if (value !== null && value !== undefined) form.append(key, String(value));
        });
        form.append('photo', new File([op.blob], op.fileName ?? 'photo.jpg', { type: op.blob.type || 'image/jpeg' }));
        if (method !== 'POST') {
            form.append('_method', method);
            method = 'POST';
        }
        body = form;
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(op.body);
    }

    // Réseau très faible : on abandonne l'essai plutôt que d'attendre indéfiniment
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), op.blob ? 120_000 : 30_000);

    try {
        const response = await fetch(op.url, { method, headers, body, credentials: 'same-origin', redirect: 'manual', signal: controller.signal });

        if (response.type === 'opaqueredirect') return { type: 'action' };

        const json = await response.json().catch(() => null);

        if (response.status === 200) return json?.ok ? { type: 'done', visit: json.visit } : { type: 'action' };
        if (response.status === 401) return { type: 'auth' };
        if (response.status === 419) {
            if (retried) return { type: 'auth' };
            await refreshToken();

            return send(op, true);
        }
        if (response.status === 428) return { type: 'action' };
        if (response.status === 413) return { type: 'rejected', message: 'Fichier trop lourd pour être envoyé.' };
        if ([403, 404, 409, 410, 422].includes(response.status)) {
            return { type: 'rejected', message: messageOf(json, response.status === 404 ? 'Élément introuvable sur le serveur.' : 'Refusé par le serveur.') };
        }

        return { type: 'network' };
    } catch {
        return { type: 'network' };
    } finally {
        window.clearTimeout(timer);
    }
}

let running = false;
let failures = 0;

export type FlushResult = { sent: OutboxOperation[]; rejected: Rejection[]; remaining: number };

/**
 * Envoie tout ce qui peut l'être. Un seul envoi à la fois, même avec plusieurs onglets ouverts.
 */
export async function flush(userId: number | undefined): Promise<FlushResult | null> {
    if (!userId || running || !outboxAvailable()) return null;
    if (state.retryAt !== null && Date.now() < state.retryAt) return null;

    const work = () => drain(userId);
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;

    return locks ? (locks.request('motriks-envois', { ifAvailable: true }, (lock) => (lock ? work() : null)) as Promise<FlushResult | null>) : work();
}

async function drain(userId: number): Promise<FlushResult> {
    running = true;
    setState({ syncing: true, blocked: null });
    const sent: OutboxOperation[] = [];
    const rejected: Rejection[] = [];

    try {
        for (;;) {
            const pending = await operations(userId);
            setState({ pending });
            const op = pending[0];
            if (!op || op.id === undefined) break;

            const outcome = await send(op);

            if (outcome.type === 'done') {
                await removeOperation(op.id);
                if (op.kind === 'checkin' && outcome.visit && outcome.visit !== op.visit) {
                    await moveVisit(userId, op.visit, outcome.visit);
                }
                if (op.kind === 'submit') {
                    // Rapport reçu : la saisie gardée sur le téléphone n'a plus d'usage
                    try {
                        window.localStorage.removeItem(`motriks:rapport:${op.visit}`);
                    } catch {
                        // stockage indisponible : rien à effacer
                    }
                }
                sent.push(op);
                failures = 0;
                continue;
            }

            if (outcome.type === 'rejected') {
                await removeOperation(op.id);
                rejected.push({ kind: op.kind, siteName: op.siteName, message: outcome.message });

                if (op.kind === 'checkin') {
                    // Sans prise de service, rien de cette journée ne peut être reçu
                    for (const other of await operations(userId)) {
                        if (other.visit === op.visit && other.id !== undefined) await removeOperation(other.id);
                    }
                    await deleteLocalVisit(op.visit);
                } else if (op.kind === 'submit') {
                    // Le rapport redevient modifiable pour être corrigé
                    await updateLocalVisit(op.visit, { reportStatus: 'draft' });
                }
                continue;
            }

            if (outcome.type === 'auth' || outcome.type === 'action') {
                setState({ blocked: outcome.type });
                break;
            }

            // Réseau absent ou trop faible : nouvel essai de plus en plus espacé (15 s → 5 min)
            failures += 1;
            setState({ retryAt: Date.now() + Math.min(300_000, 15_000 * 2 ** (failures - 1)) });
            break;
        }
    } finally {
        running = false;
        const pending = await operations(userId).catch(() => state.pending);
        setState({ syncing: false, pending, ...(pending.length === 0 || failures === 0 ? { retryAt: null } : {}) });
    }

    return { sent, rejected, remaining: state.pending.length };
}

/** Le réseau vient de revenir, ou l'hôtesse vient d'agir : on réessaie tout de suite. */
export function retryNow() {
    failures = 0;
    setState({ retryAt: null });
}

/**
 * Visites locales devenues inutiles : plus rien en attente, et soit le serveur les connaît
 * (l'accueil reçu à l'instant les affiche), soit elles ont plus de deux jours.
 */
export async function pruneLocalVisits(userId: number, serverKnows: (uuid: string) => boolean = () => false): Promise<void> {
    const pending = await operations(userId);
    const limit = Date.now() - 2 * 24 * 3600 * 1000;

    for (const visit of await localVisits(userId)) {
        const waiting = pending.some((op) => op.visit === visit.uuid);
        if (!waiting && (visit.updatedAt < limit || serverKnows(visit.uuid))) await deleteLocalVisit(visit.uuid);
    }
}

/** Libellés pour l'affichage. */
export const KIND_LABEL: Record<OutboxKind, string> = {
    checkin: 'Prise de service',
    save: 'Saisie du rapport',
    photo: 'Photo',
    submit: 'Rapport',
    checkout: 'Fin de service',
};
