import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as outbox from '@/lib/outbox';
import type { OutboxOperation } from '@/lib/outbox';
import * as offline from '@/lib/terrain-offline';

// Routes Wayfinder (générées, absentes du dépôt) : mêmes adresses que routes/web.php
vi.mock('@/routes/terrain/report', () => ({
    show: ({ visit }: { visit: string }) => ({
        url: `/terrain/rapport/${visit}`,
    }),
    update: ({ visit }: { visit: string }) => ({
        url: `/terrain/rapport/${visit}`,
    }),
    submit: ({ visit }: { visit: string }) => ({
        url: `/terrain/rapport/${visit}/soumettre`,
    }),
}));
vi.mock('@/routes/terrain/report/photos', () => ({
    store: ({ visit }: { visit: string }) => ({
        url: `/terrain/rapport/${visit}/photos`,
    }),
}));
vi.mock('@/routes/terrain/visit', () => ({
    store: () => ({ url: '/terrain/visite' }),
    checkout: ({ visit }: { visit: string }) => ({
        url: `/terrain/visite/${visit}/quitter`,
    }),
}));
vi.mock('@inertiajs/react', () => ({ router: { push: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
// La vraie file, avec la mise en file observable (pour simuler un téléphone plein)
vi.mock('@/lib/outbox', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/outbox')>();

    return { ...actual, enqueue: vi.fn(actual.enqueue) };
});

const ref = {
    userId: 1,
    visitUuid: 'visite-a',
    siteName: 'Super U Bastos',
    checkedIn: '08:15',
};

// Téléphone vierge à chaque test : file et journées locales vidées
beforeEach(async () => {
    for (const op of await outbox.operations(1))
        await outbox.removeOperation(op.id ?? 0);
    for (const visit of await outbox.localVisits(1))
        await outbox.deleteLocalVisit(visit.uuid);
});

/** Brouillon déjà en file pour une visite. */
async function draft(visit: string, notes: string) {
    await outbox.enqueueSave({
        userId: 1,
        visit,
        method: 'put',
        url: `/terrain/rapport/${visit}`,
        body: { notes },
        siteName: ref.siteName,
    });
}

const summary = (ops: OutboxOperation[]) =>
    ops.map((o) => `${o.kind}:${o.visit}`);

describe('envoi du rapport sans réseau', () => {
    it('met le rapport en file, puis retire les brouillons de la visite', async () => {
        await draft('visite-a', 'brouillon');
        await draft('visite-b', 'autre journée');

        await offline.submitReportOffline(ref, {
            notes: 'Fin de journée',
            lines: [],
        });

        const ops = await outbox.operations(1);
        expect(summary(ops)).toEqual(['save:visite-b', 'submit:visite-a']);
        const submit = ops[1];
        expect(submit).toMatchObject({
            method: 'post',
            url: '/terrain/rapport/visite-a/soumettre',
            siteName: 'Super U Bastos',
        });
        expect(submit.body).toMatchObject({
            notes: 'Fin de journée',
            lines: [],
            queued: true,
        });
        expect(submit.body.submitted_at).toEqual(
            expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        );
    });

    it('marque la journée « rapport envoyé » sur le téléphone', async () => {
        await offline.submitReportOffline(ref, { notes: '' });

        expect(await outbox.localVisit('visite-a')).toMatchObject({
            uuid: 'visite-a',
            userId: 1,
            siteName: 'Super U Bastos',
            checkedIn: '08:15',
            reportStatus: 'submitted',
        });
    });

    it('garde le rapport hors ligne d’une visite déjà sur le téléphone', async () => {
        const report = { site_name: 'Super U Bastos', lines: [{ id: -1 }] };
        await outbox.saveLocalVisit({
            uuid: 'visite-a',
            userId: 1,
            siteName: 'Super U Bastos',
            date: '2026-11-16',
            checkedIn: '08:15',
            checkedOut: null,
            reportStatus: 'draft',
            report,
            updatedAt: 0,
        });

        await offline.submitReportOffline(ref, {});

        expect(await outbox.localVisit('visite-a')).toMatchObject({
            reportStatus: 'submitted',
            report,
        });
    });

    it('si le téléphone ne peut pas garder le rapport, les brouillons restent intacts', async () => {
        await draft('visite-a', 'brouillon à ne pas perdre');
        vi.mocked(outbox.enqueue).mockRejectedValueOnce(
            new DOMException('Mémoire pleine', 'QuotaExceededError'),
        );

        await expect(
            offline.submitReportOffline(ref, { notes: 'Fin de journée' }),
        ).rejects.toThrow('Mémoire pleine');

        const ops = await outbox.operations(1);
        expect(summary(ops)).toEqual(['save:visite-a']);
        expect(ops[0].body).toEqual({ notes: 'brouillon à ne pas perdre' });
        // La journée n'est pas affichée comme envoyée
        expect(await outbox.localVisit('visite-a')).toBeUndefined();
    });

    it('« Modifier » retire le rapport de la file et le rend de nouveau modifiable', async () => {
        await offline.submitReportOffline(ref, {});

        await offline.cancelQueuedSubmit(1, 'visite-a');

        expect(await outbox.operations(1)).toEqual([]);
        expect((await outbox.localVisit('visite-a'))?.reportStatus).toBe(
            'draft',
        );
    });
});

describe('autres actions sans réseau', () => {
    it('saisie du rapport : seul le dernier brouillon est gardé, marqué « en file »', async () => {
        await offline.saveReportOffline(ref, { notes: 'premier' });
        await offline.saveReportOffline(ref, { notes: 'second' });

        const ops = await outbox.operations(1);
        expect(summary(ops)).toEqual(['save:visite-a']);
        expect(ops[0]).toMatchObject({
            method: 'put',
            url: '/terrain/rapport/visite-a',
            body: { notes: 'second', queued: true },
        });
    });

    it('prise de service : crée la journée sur le téléphone et la met en file', async () => {
        const kit = {
            affectation_id: 3,
            site_name: 'Santa Lucia Akwa',
            starts_on: '2026-11-01',
            ends_on: null,
            prepared_at: '',
            report: { site_name: 'Santa Lucia Akwa', lines: [] },
        };

        const visit = await offline.checkinOffline(1, kit, {
            latitude: 4.05,
            longitude: 9.7,
        });

        expect(visit).toMatchObject({
            userId: 1,
            siteName: 'Santa Lucia Akwa',
            checkedOut: null,
            reportStatus: 'draft',
            report: kit.report,
        });
        expect(await outbox.localVisit(visit.uuid)).toBeDefined();
        const [checkin] = await outbox.operations(1);
        expect(checkin).toMatchObject({
            kind: 'checkin',
            visit: visit.uuid,
            method: 'post',
            url: '/terrain/visite',
        });
        expect(checkin.body).toMatchObject({
            affectation_id: 3,
            latitude: 4.05,
            longitude: 9.7,
            accuracy: null,
            uuid: visit.uuid,
        });
    });

    it('fin de service : l’heure est gardée sur le téléphone et l’action mise en file', async () => {
        await offline.checkoutOffline(ref, { latitude: null, longitude: null });

        expect((await outbox.localVisit('visite-a'))?.checkedOut).toMatch(
            /^\d{2}:\d{2}$/,
        );
        const [checkout] = await outbox.operations(1);
        expect(checkout).toMatchObject({
            kind: 'checkout',
            method: 'patch',
            url: '/terrain/visite/visite-a/quitter',
        });
    });

    it('prévient clairement quand le téléphone n’a rien pu garder', async () => {
        const { toast } = await import('sonner');

        offline.offlineSaveFailed('Le rapport');

        expect(toast.error).toHaveBeenCalledWith(
            'Le rapport n’a pas pu être gardé sur ce téléphone',
            expect.objectContaining({ duration: 12_000 }),
        );
    });
});
