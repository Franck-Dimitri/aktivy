import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    canAddPack as packFits,
    countedStock,
    filledLinesCount,
    hasStockGap,
    missingGapReason,
    packUnitsByLine,
    remainingStock as sumRemainingStock,
    stockGap,
    theoreticalStock,
    totalRevenue as reportRevenue,
    totalUnitsSold,
} from '@/lib/report-math';
import { useSyncState } from '@/lib/sync';
import { addPhotoOffline } from '@/lib/terrain-offline';
import {
    externalIncomplete,
    externalTotals,
    shopsFromSales,
    type ExternalShop,
} from '@/components/terrain/external-sales-editor';
import {
    type ReportLine,
    type PackOffer,
    type Report,
    type VisitInfo,
    type Busy,
    type Step,
} from '@/components/terrain/report/types';
import {
    type LocalDraft,
    readDraft,
    writeDraft,
    clearDraft,
    useOnline,
} from '@/components/terrain/report/local-draft';

/** État du rapport : saisie (reprise du téléphone si besoin), totaux calculés, photos en attente. */
export function useReportState(visit: VisitInfo, report: Report) {
    const isSubmitted = report.status === 'submitted';
    const online = useOnline();
    const { auth } = usePage().props;
    const hasPhotos = auth.modules.includes('photos');
    // Actions de cette journée encore sur le téléphone (prise de service, saisie, photos…), dans l'ordre
    const sync = useSyncState();
    const waiting = sync.pending.filter((op) => op.visit === visit.uuid);
    const visitRef = {
        userId: auth.user.id,
        visitUuid: visit.uuid,
        siteName: report.site_name,
        checkedIn: visit.checked_in_at,
    };
    // Soumis sans réseau : le rapport attend la connexion pour partir tout seul
    const [queuedNow, setQueuedNow] = useState(false);
    const queued = queuedNow || waiting.some((op) => op.kind === 'submit');
    // Tant que la journée attend le réseau, tout passe par la file : l'ordre des actions est garanti
    const mustQueue = () => !navigator.onLine || waiting.length > 0;
    // Lignes ouvertes hors ligne avant toute réponse du serveur : leur stock d'ouverture peut avoir bougé
    const provisional = report.lines.some((l) => l.id <= 0);

    // Saisie restée sur le téléphone (réseau coupé, page fermée) : elle reprend là où elle en était
    const [restored] = useState<LocalDraft | null>(() =>
        isSubmitted || typeof window === 'undefined'
            ? null
            : (readDraft(visit.uuid) ?? readDraft(report.id)),
    );
    const [unsynced, setUnsynced] = useState(restored !== null);
    const [lines, setLines] = useState<ReportLine[]>(() =>
        restored
            ? report.lines.map((l) => {
                  const saved = restored.lines.find((d) => d.id === l.id);

                  return saved
                      ? {
                            ...l,
                            units_sold: saved.units_sold,
                            notes: saved.notes,
                        }
                      : l;
              })
            : report.lines,
    );
    const [notes, setNotes] = useState(restored?.notes ?? report.notes ?? '');
    const [incidentNotes, setIncidentNotes] = useState(
        restored?.incident ?? report.incident_notes ?? '',
    );
    const [packCounts, setPackCounts] = useState<Record<number, number>>(
        () =>
            restored?.packs ??
            Object.fromEntries(report.packs.map((p) => [p.id, p.quantity])),
    );
    // Clôture : stock compté (par défaut le stock théorique) et motif d'écart
    const [counted, setCounted] = useState<Record<number, string>>(
        restored?.counted ?? {},
    );
    const [reasons, setReasons] = useState<Record<number, string>>(
        restored?.reasons ?? {},
    );
    // Ventes en boutique extérieure : par boutique, ses produits et leurs quantités
    const [externalShops, setExternalShops] = useState<ExternalShop[]>(
        () => restored?.external ?? shopsFromSales(report.external_sales),
    );
    const [busy, setBusy] = useState<Busy>(null);
    const [step, setStep] = useState<Step>('edit');
    const [confirmCheckout, setConfirmCheckout] = useState(false);

    // Chaque changement est gardé sur le téléphone jusqu'à son enregistrement sur le serveur
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }
        if (isSubmitted) return;

        writeDraft(visit.uuid, {
            lines: lines.map((l) => ({
                id: l.id,
                units_sold: l.units_sold,
                notes: l.notes,
            })),
            packs: packCounts,
            notes,
            incident: incidentNotes,
            counted,
            reasons,
            external: externalShops,
        });
        setUnsynced(true);
    }, [
        lines,
        packCounts,
        notes,
        incidentNotes,
        counted,
        reasons,
        externalShops,
        isSubmitted,
        visit.uuid,
    ]);

    // Unités de chaque produit consommées par les packs saisis (calculs : lib/report-math.ts)
    const packUnits = packUnitsByLine(report.packs, packCounts);

    // Boutiques extérieures : comptées dans la journée, sans toucher au stock du point de vente
    const external = externalTotals(externalShops, report.external_products);
    const externalBlocking = externalIncomplete(externalShops);
    const totalSold = totalUnitsSold(lines, packUnits, external.units);
    const totalRevenue = reportRevenue(
        lines,
        report.packs,
        packCounts,
        external.revenue,
    );
    const filledCount = filledLinesCount(lines, packUnits);
    const theoretical = (l: ReportLine) => theoreticalStock(l, packUnits);
    const countOf = (l: ReportLine) => countedStock(l, counted, packUnits);
    const hasGap = (l: ReportLine) => hasStockGap(l, counted, packUnits);
    const gapOf = (l: ReportLine) => stockGap(l, counted, packUnits);
    const missingReason = missingGapReason(lines, counted, reasons, packUnits);
    const remainingStock = sumRemainingStock(lines, packUnits);
    const payloadPacks = () =>
        report.packs.map((p) => ({
            id: p.id,
            quantity: packCounts[p.id] ?? 0,
        }));

    /** Un pack de plus est possible si chacun de ses produits a encore assez de stock. */
    const canAddPack = (pack: PackOffer) => packFits(pack, lines, packUnits);
    const soldLines = lines.filter((l) => l.units_sold > 0);
    const payloadLines = () =>
        lines.map((l) => ({
            id: l.id,
            site_product_id: l.site_product_id ?? null,
            units_sold: l.units_sold,
            notes: l.notes,
        }));
    const forgetDraft = () => {
        clearDraft(visit.uuid);
        clearDraft(report.id);
    };

    function updateLine(id: number, sold: number) {
        setLines((prev) =>
            prev.map((l) =>
                l.id === id
                    ? {
                          ...l,
                          units_sold: sold,
                          closing_stock: Math.max(0, l.opening_stock - sold),
                          revenue: sold * l.unit_price,
                      }
                    : l,
            ),
        );
    }

    function updateLineNote(id: number, note: string) {
        setLines((prev) =>
            prev.map((l) => (l.id === id ? { ...l, notes: note } : l)),
        );
    }

    // Photos sans réseau : gardées sur le téléphone (déjà réduites), envoyées dans l'ordre
    const pendingPhotos = useMemo(
        () =>
            sync.pending
                .filter(
                    (op) =>
                        op.visit === visit.uuid &&
                        op.kind === 'photo' &&
                        op.blob,
                )
                .map((op) => ({
                    key: String(op.id),
                    blob: op.blob as Blob,
                    caption: (op.body.caption as string | null) ?? null,
                })),
        [sync.pending, visit.uuid],
    );
    const photosOffline = {
        // Mêmes vignettes d'un affichage à l'autre : recalculées seulement quand la file change
        pending: pendingPhotos,
        mustQueue,
        queue: (photo: Blob, fileName: string, caption: string | null) =>
            addPhotoOffline(visitRef, photo, fileName, caption),
    };

    const isEditing = !isSubmitted && step === 'edit';
    const current: 1 | 2 | 3 = isSubmitted ? 3 : step === 'review' ? 2 : 1;

    return {
        isSubmitted,
        online,
        auth,
        hasPhotos,
        waiting,
        visitRef,
        queued,
        setQueuedNow,
        mustQueue,
        provisional,
        restored,
        unsynced,
        setUnsynced,
        lines,
        notes,
        setNotes,
        incidentNotes,
        setIncidentNotes,
        packCounts,
        setPackCounts,
        counted,
        setCounted,
        reasons,
        setReasons,
        externalShops,
        setExternalShops,
        busy,
        setBusy,
        step,
        setStep,
        confirmCheckout,
        setConfirmCheckout,
        packUnits,
        external,
        externalBlocking,
        totalSold,
        totalRevenue,
        filledCount,
        theoretical,
        countOf,
        hasGap,
        gapOf,
        missingReason,
        remainingStock,
        payloadPacks,
        canAddPack,
        soldLines,
        payloadLines,
        forgetDraft,
        updateLine,
        updateLineNote,
        photosOffline,
        isEditing,
        current,
    };
}

export type ReportState = ReturnType<typeof useReportState>;
