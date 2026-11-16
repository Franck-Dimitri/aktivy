import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalVisit, OutboxOperation } from '@/lib/outbox';

type Outbox = typeof import('@/lib/outbox');
type Sync = typeof import('@/lib/sync');
let outbox: Outbox;
let sync: Sync;
let fetchMock: ReturnType<typeof vi.fn>;

const USER = 1;

// Téléphone vierge à chaque test : base neuve, modules rechargés (sync garde en mémoire
// l'état de la file, le nombre d'échecs et l'envoi en cours), réseau simulé.
beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T09:00:00'));
    vi.stubGlobal('indexedDB', new IDBFactory());
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'XSRF-TOKEN=jeton%3D1';
    vi.resetModules();
    outbox = await import('@/lib/outbox');
    sync = await import('@/lib/sync');
});

afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
});

/** Réponse du serveur (cf. App\Http\Middleware\HandleBackgroundSync). */
function reply(status: number, json: unknown = null): Response {
    return new Response(json === null ? '' : JSON.stringify(json), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

const ok = (visit?: string) =>
    reply(200, { ok: true, ...(visit ? { visit } : {}) });

function op(
    changes: Partial<OutboxOperation> = {},
): Omit<OutboxOperation, 'id' | 'createdAt'> {
    const visit = changes.visit ?? 'visite-a';

    return {
        userId: USER,
        kind: 'save',
        visit,
        method: 'put',
        url: `/terrain/rapport/${visit}`,
        body: {},
        siteName: 'Carrefour Bonamoussadi',
        ...changes,
    };
}

function localVisit(changes: Partial<LocalVisit> = {}): LocalVisit {
    return {
        uuid: 'visite-a',
        userId: USER,
        siteName: 'Carrefour Bonamoussadi',
        date: '2026-11-16',
        checkedIn: '08:00',
        checkedOut: null,
        reportStatus: 'draft',
        report: null,
        updatedAt: 0,
        ...changes,
    };
}

/** URL des requêtes envoyées, dans l'ordre. */
const calledUrls = () => fetchMock.mock.calls.map(([url]) => url as string);
const pendingKinds = async (userId = USER) =>
    (await outbox.operations(userId)).map((o) => o.kind);

describe('envoi de la file', () => {
    it('envoie les actions une par une, dans l’ordre, puis vide la file', async () => {
        await outbox.enqueue(
            op({
                kind: 'checkin',
                method: 'post',
                url: '/terrain/visite',
                body: { affectation_id: 3 },
            }),
        );
        await outbox.enqueue(op({ kind: 'save', body: { notes: 'RAS' } }));
        await outbox.enqueue(
            op({
                kind: 'submit',
                method: 'post',
                url: '/terrain/rapport/visite-a/soumettre',
            }),
        );
        await outbox.enqueue(
            op({
                kind: 'checkout',
                method: 'patch',
                url: '/terrain/visite/visite-a/quitter',
            }),
        );
        fetchMock.mockImplementation(async () => ok());

        const result = await sync.flush(USER);

        expect(calledUrls()).toEqual([
            '/terrain/visite',
            '/terrain/rapport/visite-a',
            '/terrain/rapport/visite-a/soumettre',
            '/terrain/visite/visite-a/quitter',
        ]);
        expect(result?.sent.map((o) => o.kind)).toEqual([
            'checkin',
            'save',
            'submit',
            'checkout',
        ]);
        expect(result).toMatchObject({ rejected: [], remaining: 0 });
        expect(await outbox.operations(USER)).toEqual([]);
        expect(sync.syncState()).toMatchObject({
            syncing: false,
            blocked: null,
            retryAt: null,
            pending: [],
        });
    });

    it('envoie en JSON, avec le jeton anti-falsification et l’en-tête de synchronisation', async () => {
        await outbox.enqueue(
            op({ kind: 'checkout', method: 'patch', body: { latitude: 4.05 } }),
        );
        fetchMock.mockResolvedValue(ok());

        await sync.flush(USER);

        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('PATCH');
        expect(init.body).toBe(JSON.stringify({ latitude: 4.05 }));
        expect(init.headers).toMatchObject({
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Motriks-Sync': '1',
            'X-XSRF-TOKEN': 'jeton=1',
        });
    });

    it('n’envoie pas les actions d’une autre hôtesse', async () => {
        await outbox.enqueue(op({ userId: 2 }));
        await outbox.enqueue(op({ userId: USER }));
        fetchMock.mockResolvedValue(ok());

        await sync.flush(USER);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(await pendingKinds(2)).toEqual(['save']);
    });

    it('ne fait rien sans hôtesse connectée', async () => {
        expect(await sync.flush(undefined)).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('efface la saisie gardée sur le téléphone une fois le rapport reçu', async () => {
        window.localStorage.setItem('motriks:rapport:visite-a', '{}');
        await outbox.enqueue(op({ kind: 'submit', method: 'post' }));
        fetchMock.mockResolvedValue(ok());

        await sync.flush(USER);

        expect(
            window.localStorage.getItem('motriks:rapport:visite-a'),
        ).toBeNull();
    });

    it('rattache la suite de la journée à la visite que le serveur a retenue', async () => {
        await outbox.saveLocalVisit(localVisit({ uuid: 'locale' }));
        await outbox.enqueue(
            op({
                kind: 'checkin',
                visit: 'locale',
                method: 'post',
                url: '/terrain/visite',
            }),
        );
        await outbox.enqueue(op({ kind: 'save', visit: 'locale' }));
        fetchMock
            .mockResolvedValueOnce(ok('serveur'))
            .mockResolvedValueOnce(ok());

        await sync.flush(USER);

        expect(calledUrls()).toEqual([
            '/terrain/visite',
            '/terrain/rapport/serveur',
        ]);
        expect(await outbox.localVisit('serveur')).toBeDefined();
        expect(await outbox.localVisit('locale')).toBeUndefined();
    });
});

describe('réseau absent ou trop faible', () => {
    it('garde l’action, arrête l’envoi et prévoit un nouvel essai dans 15 s', async () => {
        await outbox.enqueue(op({ kind: 'checkin', method: 'post' }));
        await outbox.enqueue(op({ kind: 'save' }));
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        const result = await sync.flush(USER);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ sent: [], rejected: [], remaining: 2 });
        expect(await pendingKinds()).toEqual(['checkin', 'save']);
        expect(sync.syncState().retryAt).toBe(Date.now() + 15_000);
    });

    it('n’essaie pas avant l’heure prévue, puis espace de plus en plus les essais', async () => {
        await outbox.enqueue(op());
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        await sync.flush(USER);
        // Trop tôt : rien ne part
        vi.advanceTimersByTime(14_000);
        expect(await sync.flush(USER)).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // 15 s passées : deuxième essai, puis 30 s d'attente
        vi.advanceTimersByTime(1_000);
        await sync.flush(USER);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(sync.syncState().retryAt).toBe(Date.now() + 30_000);

        vi.advanceTimersByTime(30_000);
        await sync.flush(USER);
        expect(sync.syncState().retryAt).toBe(Date.now() + 60_000);
    });

    it('n’attend jamais plus de 5 minutes entre deux essais', async () => {
        await outbox.enqueue(op());
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        const waits: number[] = [];
        for (let i = 0; i < 8; i++) {
            await sync.flush(USER);
            const retryAt = sync.syncState().retryAt ?? 0;
            waits.push((retryAt - Date.now()) / 1000);
            vi.setSystemTime(retryAt);
        }

        expect(waits).toEqual([15, 30, 60, 120, 240, 300, 300, 300]);
    });

    it('traite une erreur du serveur (500) comme une coupure : l’action reste', async () => {
        await outbox.enqueue(op());
        fetchMock.mockResolvedValue(reply(500));

        await sync.flush(USER);

        expect(await pendingKinds()).toEqual(['save']);
        expect(sync.syncState().retryAt).toBe(Date.now() + 15_000);
    });

    it('réessaie tout de suite quand le réseau revient, et oublie l’attente une fois tout parti', async () => {
        await outbox.enqueue(op());
        fetchMock
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(ok());

        await sync.flush(USER);
        sync.retryNow();
        const result = await sync.flush(USER);

        expect(result?.sent).toHaveLength(1);
        expect(sync.syncState().retryAt).toBeNull();
    });
});

describe('jeton anti-falsification expiré (419)', () => {
    it('demande un jeton neuf puis renvoie l’action', async () => {
        await outbox.enqueue(op());
        fetchMock
            .mockResolvedValueOnce(reply(419))
            .mockResolvedValueOnce(reply(200))
            .mockResolvedValueOnce(ok());

        const result = await sync.flush(USER);

        expect(calledUrls()).toEqual([
            '/terrain/rapport/visite-a',
            '/app',
            '/terrain/rapport/visite-a',
        ]);
        expect(result?.sent).toHaveLength(1);
        expect(await outbox.operations(USER)).toEqual([]);
    });

    it('demande de se reconnecter si le jeton neuf est refusé aussi', async () => {
        await outbox.enqueue(op());
        fetchMock.mockImplementation(async (url: string) =>
            url === '/app' ? reply(200) : reply(419),
        );

        await sync.flush(USER);

        expect(calledUrls()).toEqual([
            '/terrain/rapport/visite-a',
            '/app',
            '/terrain/rapport/visite-a',
        ]);
        expect(sync.syncState().blocked).toBe('auth');
        expect(await pendingKinds()).toEqual(['save']);
    });
});

describe('blocages', () => {
    it('session expirée (401) : tout attend que l’hôtesse se reconnecte', async () => {
        await outbox.enqueue(op({ kind: 'save' }));
        await outbox.enqueue(op({ kind: 'checkout', method: 'patch' }));
        fetchMock.mockResolvedValue(reply(401));

        const result = await sync.flush(USER);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sync.syncState().blocked).toBe('auth');
        expect(result).toMatchObject({ sent: [], rejected: [], remaining: 2 });
        expect(await pendingKinds()).toEqual(['save', 'checkout']);
        // Pas de nouvel essai automatique : ce n'est pas une coupure
        expect(sync.syncState().retryAt).toBeNull();
    });

    it('action demandée à l’hôtesse (428 ou réponse sans « ok ») : la file s’arrête sans rien perdre', async () => {
        await outbox.enqueue(op());
        fetchMock.mockResolvedValueOnce(reply(428));

        await sync.flush(USER);
        expect(sync.syncState().blocked).toBe('action');

        fetchMock.mockResolvedValueOnce(reply(200, { ok: false }));
        await sync.flush(USER);
        expect(sync.syncState().blocked).toBe('action');
        expect(await pendingKinds()).toEqual(['save']);
    });

    it('redirection vers la connexion : la file s’arrête', async () => {
        await outbox.enqueue(op());
        fetchMock.mockResolvedValue({
            type: 'opaqueredirect',
            status: 0,
        } as Response);

        await sync.flush(USER);

        expect(sync.syncState().blocked).toBe('action');
        expect(await pendingKinds()).toEqual(['save']);
    });

    it('un nouvel envoi lève le blocage précédent', async () => {
        await outbox.enqueue(op());
        fetchMock.mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(ok());

        await sync.flush(USER);
        expect(sync.syncState().blocked).toBe('auth');

        await sync.flush(USER);
        expect(sync.syncState().blocked).toBeNull();
        expect(await outbox.operations(USER)).toEqual([]);
    });
});

describe('refus du serveur', () => {
    it('retire l’action refusée (422), la signale avec le message du serveur, et passe à la suivante', async () => {
        await outbox.enqueue(
            op({
                kind: 'photo',
                method: 'post',
                url: '/terrain/rapport/visite-a/photos',
            }),
        );
        await outbox.enqueue(op({ kind: 'save' }));
        fetchMock
            .mockResolvedValueOnce(
                reply(422, {
                    message: 'Données invalides.',
                    errors: { caption: ['La légende est trop longue.'] },
                }),
            )
            .mockResolvedValueOnce(ok());

        const result = await sync.flush(USER);

        expect(result?.rejected).toEqual([
            {
                kind: 'photo',
                siteName: 'Carrefour Bonamoussadi',
                message: 'La légende est trop longue.',
            },
        ]);
        expect(result?.sent.map((o) => o.kind)).toEqual(['save']);
        expect(await outbox.operations(USER)).toEqual([]);
    });

    it('prend le message général, ou un message par défaut, faute de détail', async () => {
        await outbox.enqueue(op({ kind: 'save' }));
        await outbox.enqueue(op({ kind: 'checkout', method: 'patch' }));
        await outbox.enqueue(op({ kind: 'photo', method: 'post' }));
        fetchMock
            .mockResolvedValueOnce(
                reply(409, { message: 'Service déjà terminé.' }),
            )
            .mockResolvedValueOnce(reply(404))
            .mockResolvedValueOnce(reply(413));

        const result = await sync.flush(USER);

        expect(result?.rejected.map((r) => r.message)).toEqual([
            'Service déjà terminé.',
            'Élément introuvable sur le serveur.',
            'Fichier trop lourd pour être envoyé.',
        ]);
    });

    it('rend le rapport refusé de nouveau modifiable', async () => {
        await outbox.saveLocalVisit(localVisit({ reportStatus: 'submitted' }));
        await outbox.enqueue(op({ kind: 'submit', method: 'post' }));
        fetchMock.mockResolvedValue(
            reply(422, { message: 'Stock compté invalide.' }),
        );

        await sync.flush(USER);

        expect((await outbox.localVisit('visite-a'))?.reportStatus).toBe(
            'draft',
        );
    });

    it('prise de service refusée : la journée locale et toutes ses actions disparaissent', async () => {
        await outbox.saveLocalVisit(localVisit({ uuid: 'visite-a' }));
        await outbox.saveLocalVisit(localVisit({ uuid: 'visite-b' }));
        await outbox.enqueue(
            op({
                kind: 'checkin',
                visit: 'visite-a',
                method: 'post',
                url: '/terrain/visite',
            }),
        );
        await outbox.enqueue(op({ kind: 'save', visit: 'visite-a' }));
        await outbox.enqueue(
            op({
                kind: 'submit',
                visit: 'visite-a',
                method: 'post',
                url: '/terrain/rapport/visite-a/soumettre',
            }),
        );
        await outbox.enqueue(op({ kind: 'save', visit: 'visite-b' }));
        fetchMock
            .mockResolvedValueOnce(
                reply(422, { message: 'Affectation terminée.' }),
            )
            .mockResolvedValueOnce(ok());

        const result = await sync.flush(USER);

        // La prise de service est signalée, avec ce qui part avec elle (saisie, rapport) : l'hôtesse
        // sait qu'elle doit prévenir son responsable. Ces actions ne partent pas.
        expect(result?.rejected).toEqual([
            {
                kind: 'checkin',
                siteName: 'Carrefour Bonamoussadi',
                message:
                    'Affectation terminée. Le reste de la journée (saisie du rapport, rapport) n’a pas pu être envoyé : prévenez votre responsable.',
            },
        ]);
        expect(calledUrls()).toEqual([
            '/terrain/visite',
            '/terrain/rapport/visite-b',
        ]);
        expect(await outbox.localVisit('visite-a')).toBeUndefined();
        expect(await outbox.localVisit('visite-b')).toBeDefined();
        expect(await outbox.operations(USER)).toEqual([]);
    });
});

describe('visites locales devenues inutiles', () => {
    it('efface celles que le serveur connaît ou trop anciennes, garde celles qui attendent', async () => {
        const now = Date.now();
        await outbox.saveLocalVisit(localVisit({ uuid: 'connue' }));
        await outbox.saveLocalVisit(localVisit({ uuid: 'en-attente' }));
        await outbox.enqueue(op({ visit: 'en-attente' }));
        vi.setSystemTime(now - 3 * 24 * 3600 * 1000);
        await outbox.saveLocalVisit(localVisit({ uuid: 'ancienne' }));
        vi.setSystemTime(now);
        await outbox.saveLocalVisit(localVisit({ uuid: 'recente' }));

        await sync.pruneLocalVisits(
            USER,
            (uuid) => uuid === 'connue' || uuid === 'en-attente',
        );

        expect(
            (await outbox.localVisits(USER)).map((v) => v.uuid).sort(),
        ).toEqual(['en-attente', 'recente']);
    });
});
