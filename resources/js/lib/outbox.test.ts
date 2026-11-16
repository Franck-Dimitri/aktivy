import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalVisit, OutboxOperation } from '@/lib/outbox';

type Outbox = typeof import('@/lib/outbox');
let outbox: Outbox;

// Chaque test part d'un téléphone vierge : base IndexedDB neuve et module rechargé
// (le module garde la connexion à la base ouverte).
beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.resetModules();
    outbox = await import('@/lib/outbox');
});

function op(
    changes: Partial<OutboxOperation> = {},
): Omit<OutboxOperation, 'id' | 'createdAt'> {
    return {
        userId: 1,
        kind: 'checkin',
        visit: 'visite-a',
        method: 'post',
        url: '/terrain/visite',
        body: {},
        siteName: 'Carrefour Bonamoussadi',
        ...changes,
    };
}

function visit(changes: Partial<LocalVisit> = {}): LocalVisit {
    return {
        uuid: 'visite-a',
        userId: 1,
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

describe('file des actions hors ligne', () => {
    it('garde une action avec son numéro et son heure, et prévient l’application', async () => {
        const listener = vi.fn();
        window.addEventListener('motriks:outbox', listener);

        await outbox.enqueue(op({ body: { affectation_id: 3 } }));
        window.removeEventListener('motriks:outbox', listener);

        const [saved] = await outbox.operations(1);
        expect(saved).toMatchObject({
            kind: 'checkin',
            visit: 'visite-a',
            body: { affectation_id: 3 },
        });
        expect(saved.id).toEqual(expect.any(Number));
        expect(saved.createdAt).toEqual(expect.any(Number));
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('rend les actions dans l’ordre où elles ont été faites', async () => {
        await outbox.enqueue(op({ kind: 'checkin' }));
        await outbox.enqueue(op({ kind: 'photo' }));
        await outbox.enqueue(op({ kind: 'submit' }));
        await outbox.enqueue(op({ kind: 'checkout' }));

        expect((await outbox.operations(1)).map((o) => o.kind)).toEqual([
            'checkin',
            'photo',
            'submit',
            'checkout',
        ]);
    });

    it('ne rend que les actions de l’hôtesse demandée', async () => {
        await outbox.enqueue(op({ userId: 1, visit: 'visite-a' }));
        await outbox.enqueue(op({ userId: 2, visit: 'visite-b' }));
        await outbox.enqueue(op({ userId: 1, visit: 'visite-c' }));

        expect((await outbox.operations(1)).map((o) => o.visit)).toEqual([
            'visite-a',
            'visite-c',
        ]);
        expect((await outbox.operations(2)).map((o) => o.visit)).toEqual([
            'visite-b',
        ]);
        expect(await outbox.operations(3)).toEqual([]);
    });

    it('retire une action par son numéro', async () => {
        await outbox.enqueue(op({ kind: 'checkin' }));
        await outbox.enqueue(op({ kind: 'checkout' }));
        const [first] = await outbox.operations(1);

        await outbox.removeOperation(first.id ?? 0);

        expect((await outbox.operations(1)).map((o) => o.kind)).toEqual([
            'checkout',
        ]);
    });

    it('rend une file vide sur un téléphone neuf', async () => {
        expect(await outbox.operations(1)).toEqual([]);
        expect(outbox.outboxAvailable()).toBe(true);
    });
});

describe('brouillons du rapport', () => {
    it('remplace le brouillon précédent à sa place dans la file', async () => {
        await outbox.enqueueSave(
            op({ method: 'put', body: { notes: 'premier' } }),
        );
        await outbox.enqueue(op({ kind: 'photo' }));
        await outbox.enqueueSave(
            op({ method: 'put', body: { notes: 'second' } }),
        );

        const ops = await outbox.operations(1);
        expect(ops.map((o) => o.kind)).toEqual(['save', 'photo']);
        expect(ops[0].body).toEqual({ notes: 'second' });
    });

    it('garde un brouillon par visite', async () => {
        await outbox.enqueueSave(op({ visit: 'visite-a', method: 'put' }));
        await outbox.enqueueSave(op({ visit: 'visite-b', method: 'put' }));

        expect((await outbox.operations(1)).map((o) => o.visit)).toEqual([
            'visite-a',
            'visite-b',
        ]);
    });

    it('ne touche pas au brouillon d’une autre hôtesse', async () => {
        await outbox.enqueueSave(
            op({ userId: 2, method: 'put', body: { notes: 'autre' } }),
        );
        await outbox.enqueueSave(
            op({ userId: 1, method: 'put', body: { notes: 'moi' } }),
        );

        expect((await outbox.operations(2))[0].body).toEqual({
            notes: 'autre',
        });
        expect((await outbox.operations(1))[0].body).toEqual({ notes: 'moi' });
    });

    it('retire les brouillons d’une visite, et seulement eux', async () => {
        await outbox.enqueue(op({ kind: 'checkin', visit: 'visite-a' }));
        await outbox.enqueueSave(op({ visit: 'visite-a', method: 'put' }));
        await outbox.enqueueSave(op({ visit: 'visite-b', method: 'put' }));
        await outbox.enqueueSave(
            op({ userId: 2, visit: 'visite-a', method: 'put' }),
        );

        await outbox.dropSaves(1, 'visite-a');

        expect(
            (await outbox.operations(1)).map((o) => `${o.kind}:${o.visit}`),
        ).toEqual(['checkin:visite-a', 'save:visite-b']);
        expect(await outbox.operations(2)).toHaveLength(1);
    });
});

describe('visites locales', () => {
    it('rend les visites de l’hôtesse, la plus récente d’abord', async () => {
        const now = vi.spyOn(Date, 'now');
        now.mockReturnValue(1000);
        await outbox.saveLocalVisit(visit({ uuid: 'ancienne' }));
        now.mockReturnValue(2000);
        await outbox.saveLocalVisit(visit({ uuid: 'recente' }));
        await outbox.saveLocalVisit(visit({ uuid: 'autre', userId: 2 }));

        expect((await outbox.localVisits(1)).map((v) => v.uuid)).toEqual([
            'recente',
            'ancienne',
        ]);
    });

    it('modifie puis supprime une visite', async () => {
        await outbox.saveLocalVisit(visit());

        await outbox.updateLocalVisit('visite-a', {
            reportStatus: 'submitted',
            checkedOut: '17:30',
        });
        expect(await outbox.localVisit('visite-a')).toMatchObject({
            reportStatus: 'submitted',
            checkedOut: '17:30',
            siteName: 'Carrefour Bonamoussadi',
        });

        await outbox.deleteLocalVisit('visite-a');
        expect(await outbox.localVisit('visite-a')).toBeUndefined();
    });

    it('ne crée rien en modifiant une visite inconnue', async () => {
        await outbox.updateLocalVisit('inconnue', {
            reportStatus: 'submitted',
        });

        expect(await outbox.localVisit('inconnue')).toBeUndefined();
    });

    it('rattache actions et visite locale à la visite choisie par le serveur', async () => {
        await outbox.saveLocalVisit(visit({ uuid: 'locale' }));
        await outbox.enqueue(
            op({
                kind: 'photo',
                visit: 'locale',
                url: '/terrain/rapport/locale/photos',
            }),
        );
        await outbox.enqueue(
            op({
                kind: 'photo',
                visit: 'autre',
                url: '/terrain/rapport/autre/photos',
            }),
        );

        await outbox.moveVisit(1, 'locale', 'serveur');

        expect(
            (await outbox.operations(1)).map((o) => [o.visit, o.url]),
        ).toEqual([
            ['serveur', '/terrain/rapport/serveur/photos'],
            ['autre', '/terrain/rapport/autre/photos'],
        ]);
        expect(await outbox.localVisit('locale')).toBeUndefined();
        expect(await outbox.localVisit('serveur')).toMatchObject({
            uuid: 'serveur',
            siteName: 'Carrefour Bonamoussadi',
        });
    });
});

describe('outils', () => {
    it('donne le jour du téléphone au format AAAA-MM-JJ', () => {
        expect(outbox.localDay(new Date(2026, 0, 5, 23, 59))).toBe(
            '2026-01-05',
        );
    });

    it('fabrique des identifiants de visite uniques', () => {
        const a = outbox.newUuid();

        expect(a).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        expect(outbox.newUuid()).not.toBe(a);
    });
});
