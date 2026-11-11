import { router } from '@inertiajs/react';
import { show as reportShow } from '@/routes/terrain/report';
import { store as photoStore } from '@/routes/terrain/report/photos';
import { checkout as visitCheckout, store as visitStore } from '@/routes/terrain/visit';
import { submit as reportSubmit, update as reportUpdate } from '@/routes/terrain/report';
import {
    dropSaves,
    enqueue,
    enqueueSave,
    localDay,
    localTime,
    localVisit,
    newUuid,
    notifyOutbox,
    operations,
    removeOperation,
    saveLocalVisit,
    updateLocalVisit,
    type LocalReport,
    type LocalVisit,
} from '@/lib/outbox';

/**
 * Actions de l'hôtesse sans réseau : chacune est gardée dans la file (lib/outbox.ts) avec l'heure du
 * téléphone, et l'écran avance comme si elle était déjà partie.
 */

/** Trousse hors ligne envoyée avec l'accueil (App\Support\Terrain\OfflineKit). */
export type OfflineKit = {
    affectation_id: number;
    site_name: string;
    starts_on: string;
    ends_on: string | null;
    prepared_at: string;
    report: LocalReport;
};

export type Coords = { latitude: number | null; longitude: number | null; accuracy?: number | null };

/** La trousse permet-elle de pointer aujourd'hui ? */
export function kitUsableToday(kit: OfflineKit | null | undefined, affectationId: number | undefined): kit is OfflineKit {
    if (!kit || kit.affectation_id !== affectationId) return false;
    const today = localDay();

    return kit.starts_on <= today && (kit.ends_on === null || kit.ends_on >= today);
}

/** Prise de service sans réseau : la visite est créée sur le téléphone, le rapport s'ouvre. */
export async function checkinOffline(userId: number, kit: OfflineKit, coords: Coords): Promise<LocalVisit> {
    const now = new Date();
    const uuid = newUuid();
    const visit: LocalVisit = {
        uuid,
        userId,
        siteName: kit.site_name,
        date: localDay(now),
        checkedIn: localTime(now),
        checkedOut: null,
        reportStatus: 'draft',
        report: kit.report,
        updatedAt: Date.now(),
    };

    await saveLocalVisit(visit);
    await enqueue({
        userId,
        kind: 'checkin',
        visit: uuid,
        method: 'post',
        url: visitStore().url,
        body: {
            affectation_id: kit.affectation_id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
            uuid,
            checked_in_at: now.toISOString(),
        },
        siteName: kit.site_name,
    });

    return visit;
}

/** Ouvre le rapport d'une visite pas encore reçue par le serveur, avec les données du téléphone. */
export function openLocalReport(visit: LocalVisit) {
    if (!visit.report) return;

    const reportDate = new Date(`${visit.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    router.push({
        url: reportShow({ visit: visit.uuid }).url,
        component: 'terrain/report',
        props: (current) => ({
            ...current,
            visit: { id: 0, uuid: visit.uuid, checked_in_at: visit.checkedIn, checked_out_at: visit.checkedOut, status: visit.checkedOut ? 'completed' : 'in_progress' },
            // Toujours « brouillon » : un rapport déjà prêt à partir s'affiche comme tel (file d'attente)
            report: { ...visit.report, report_date: reportDate, status: 'draft' },
        }),
    });
}

type VisitRef = { userId: number; visitUuid: string; siteName: string; checkedIn: string };

/** Garde (ou crée) la visite sur le téléphone pour que l'accueil affiche l'état réel de la journée. */
async function overlay(ref: VisitRef, changes: Partial<LocalVisit>) {
    const current = await localVisit(ref.visitUuid);

    if (current) {
        await updateLocalVisit(ref.visitUuid, changes);

        return;
    }

    await saveLocalVisit({
        uuid: ref.visitUuid,
        userId: ref.userId,
        siteName: ref.siteName,
        date: localDay(),
        checkedIn: ref.checkedIn,
        checkedOut: null,
        reportStatus: 'draft',
        report: null,
        updatedAt: Date.now(),
        ...changes,
    });
}

export async function checkoutOffline(ref: VisitRef, coords: Coords): Promise<void> {
    const now = new Date();

    await overlay(ref, { checkedOut: localTime(now) });
    await enqueue({
        userId: ref.userId,
        kind: 'checkout',
        visit: ref.visitUuid,
        method: 'patch',
        url: visitCheckout({ visit: ref.visitUuid }).url,
        body: { latitude: coords.latitude, longitude: coords.longitude, checked_out_at: now.toISOString() },
        siteName: ref.siteName,
    });
}

export async function saveReportOffline(ref: VisitRef, payload: Record<string, unknown>): Promise<void> {
    await enqueueSave({
        userId: ref.userId,
        visit: ref.visitUuid,
        method: 'put',
        url: reportUpdate({ visit: ref.visitUuid }).url,
        body: { ...payload, queued: true },
        siteName: ref.siteName,
    });
}

export async function submitReportOffline(ref: VisitRef, payload: Record<string, unknown>): Promise<void> {
    // Le rapport complet remplace les brouillons pas encore partis
    await dropSaves(ref.userId, ref.visitUuid);
    await overlay(ref, { reportStatus: 'submitted' });
    await enqueue({
        userId: ref.userId,
        kind: 'submit',
        visit: ref.visitUuid,
        method: 'post',
        url: reportSubmit({ visit: ref.visitUuid }).url,
        body: { ...payload, queued: true, submitted_at: new Date().toISOString() },
        siteName: ref.siteName,
    });
}

export async function addPhotoOffline(ref: VisitRef, photo: Blob, fileName: string, caption: string | null): Promise<void> {
    await enqueue({
        userId: ref.userId,
        kind: 'photo',
        visit: ref.visitUuid,
        method: 'post',
        url: photoStore({ visit: ref.visitUuid }).url,
        body: { caption, uuid: newUuid() },
        blob: photo,
        fileName,
        siteName: ref.siteName,
    });
}

/* ─── Ancienne file (rapports seulement, dans localStorage) ─── */

const LEGACY_KEY = 'motriks:rapports-a-envoyer';

/** Rapports mis en attente par l'ancienne version de l'application : repris dans la nouvelle file. */
export async function adoptLegacyQueue(userId: number): Promise<void> {
    let items: { userId: number; url: string; payload: Record<string, unknown>; siteName: string }[] = [];

    try {
        items = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? '[]');
    } catch {
        return;
    }

    const mine = items.filter((item) => item.userId === userId);
    if (mine.length === 0) return;

    for (const item of mine) {
        const uuid = item.url.match(/rapport\/([^/]+)\/soumettre/)?.[1];
        if (!uuid) continue;
        await enqueue({ userId, kind: 'submit', visit: uuid, method: 'post', url: item.url, body: { ...item.payload, queued: true }, siteName: item.siteName });
    }

    try {
        window.localStorage.setItem(LEGACY_KEY, JSON.stringify(items.filter((item) => item.userId !== userId)));
    } catch {
        // stockage indisponible : la file sera reprise une autre fois
    }
}

/** « Modifier » un rapport prêt à partir : il reste sur le téléphone, de nouveau modifiable. */
export async function cancelQueuedSubmit(userId: number, visitUuid: string): Promise<void> {
    for (const op of await operations(userId)) {
        if (op.kind === 'submit' && op.visit === visitUuid && op.id !== undefined) await removeOperation(op.id);
    }
    await updateLocalVisit(visitUuid, { reportStatus: 'draft' });
    notifyOutbox();
}
