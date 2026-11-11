/**
 * Mode hors ligne de l'hôtesse : file des actions faites sans réseau, gardée sur le téléphone.
 *
 * Prise de service, saisie du rapport, photos, envoi du rapport et fin de service y attendent le
 * réseau, dans l'ordre où elles ont été faites ; resources/js/lib/sync.ts les envoie ensuite.
 * IndexedDB (et non localStorage) : il garde les photos, et survit à la fermeture de l'application.
 *
 * Une prise de service faite hors ligne crée aussi une « visite locale » : de quoi afficher la journée
 * et rouvrir le rapport sans réseau. Elle disparaît une fois toutes ses actions reçues par le serveur.
 */

export type OutboxKind = 'checkin' | 'save' | 'photo' | 'submit' | 'checkout';

export type OutboxOperation = {
    id?: number;
    userId: number;
    kind: OutboxKind;
    /** Identifiant public de la visite concernée (choisi par le téléphone pour une prise de service hors ligne) */
    visit: string;
    method: 'post' | 'put' | 'patch';
    url: string;
    body: Record<string, unknown>;
    /** Photo : le fichier, déjà réduit */
    blob?: Blob;
    fileName?: string;
    siteName: string;
    createdAt: number;
};

/** Rapport tel que l'affiche la page « Rapport » (forme de DailyReportController::show / OfflineKit). */
export type LocalReport = Record<string, unknown> & { site_name: string; lines: unknown[] };

export type LocalVisit = {
    uuid: string;
    userId: number;
    siteName: string;
    /** Jour du pointage (AAAA-MM-JJ, heure du téléphone) */
    date: string;
    /** Heures affichées (HH:MM) */
    checkedIn: string;
    checkedOut: string | null;
    reportStatus: 'draft' | 'submitted';
    /** Rapport de la trousse hors ligne, pour rouvrir la saisie sans réseau (prise de service hors ligne) */
    report: LocalReport | null;
    updatedAt: number;
};

const DB_NAME = 'motriks-hors-ligne';
const OPERATIONS = 'operations';
const VISITS = 'visites';

let opening: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
    if (opening) return opening;

    opening = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(OPERATIONS)) db.createObjectStore(OPERATIONS, { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains(VISITS)) db.createObjectStore(VISITS, { keyPath: 'uuid' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            opening = null;
            reject(request.error);
        };
    });

    return opening;
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
    return database().then(
        (db) =>
            new Promise<T | undefined>((resolve, reject) => {
                const tx = db.transaction(store, mode);
                const request = work(tx.objectStore(store));
                tx.oncomplete = () => resolve(request ? request.result : undefined);
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            }),
    );
}

/** Prévient l'application (bandeau, pages) qu'il y a du changement dans la file. */
export function notifyOutbox() {
    window.dispatchEvent(new CustomEvent('motriks:outbox'));
}

/* ─── Opérations ─── */

export async function operations(userId: number): Promise<OutboxOperation[]> {
    const all = ((await run<OutboxOperation[]>(OPERATIONS, 'readonly', (s) => s.getAll())) ?? []) as OutboxOperation[];

    return all.filter((op) => op.userId === userId).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function enqueue(op: Omit<OutboxOperation, 'id' | 'createdAt'>): Promise<void> {
    await run(OPERATIONS, 'readwrite', (s) => s.add({ ...op, createdAt: Date.now() }));
    notifyOutbox();
}

/**
 * Brouillon du rapport : seul le dernier compte. Le précédent, pas encore parti, est remplacé
 * (à sa place dans la file s'il y en avait un, sinon à la fin).
 */
export async function enqueueSave(op: Omit<OutboxOperation, 'id' | 'createdAt' | 'kind'>): Promise<void> {
    const previous = (await operations(op.userId)).find((o) => o.kind === 'save' && o.visit === op.visit);

    if (previous?.id !== undefined) {
        await run(OPERATIONS, 'readwrite', (s) => s.put({ ...previous, ...op, kind: 'save' }));
        notifyOutbox();

        return;
    }

    await enqueue({ ...op, kind: 'save' });
}

export async function removeOperation(id: number): Promise<void> {
    await run(OPERATIONS, 'readwrite', (s) => s.delete(id));
}

/** Brouillons d'une visite devenus inutiles (le rapport complet part après eux). */
export async function dropSaves(userId: number, visit: string): Promise<void> {
    for (const op of await operations(userId)) {
        if (op.kind === 'save' && op.visit === visit && op.id !== undefined) await removeOperation(op.id);
    }
}

/**
 * Le serveur a rattaché la prise de service à une autre visite (déjà pointé ce jour-là) :
 * les actions suivantes et la visite locale suivent.
 */
export async function moveVisit(userId: number, from: string, to: string): Promise<void> {
    for (const op of await operations(userId)) {
        if (op.visit !== from) continue;
        await run(OPERATIONS, 'readwrite', (s) => s.put({ ...op, visit: to, url: op.url.replace(from, to) }));
    }

    const local = await localVisit(from);
    if (local) {
        await run(VISITS, 'readwrite', (s) => s.delete(from));
        await saveLocalVisit({ ...local, uuid: to });
    }
}

/* ─── Visites locales ─── */

export async function localVisit(uuid: string): Promise<LocalVisit | undefined> {
    return (await run<LocalVisit>(VISITS, 'readonly', (s) => s.get(uuid))) as LocalVisit | undefined;
}

export async function localVisits(userId: number): Promise<LocalVisit[]> {
    const all = ((await run<LocalVisit[]>(VISITS, 'readonly', (s) => s.getAll())) ?? []) as LocalVisit[];

    return all.filter((v) => v.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveLocalVisit(visit: LocalVisit): Promise<void> {
    await run(VISITS, 'readwrite', (s) => s.put({ ...visit, updatedAt: Date.now() }));
    notifyOutbox();
}

export async function updateLocalVisit(uuid: string, changes: Partial<LocalVisit>): Promise<void> {
    const current = await localVisit(uuid);
    if (current) await saveLocalVisit({ ...current, ...changes });
}

export async function deleteLocalVisit(uuid: string): Promise<void> {
    await run(VISITS, 'readwrite', (s) => s.delete(uuid));
}

/* ─── Outils ─── */

/** Identifiant public d'une visite ou d'une photo créée hors ligne. */
export function newUuid(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Jour (AAAA-MM-JJ) et heure (HH:MM) du téléphone. */
export function localDay(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTime(date = new Date()): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** IndexedDB disponible (absent dans certains modes privés) : sinon, pas de mode hors ligne. */
export function outboxAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
}
