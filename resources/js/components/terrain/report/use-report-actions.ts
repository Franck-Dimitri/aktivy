import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { toastFormError } from '@/lib/form-toast';
import { haptic } from '@/lib/haptics';
import { home as terrainHome } from '@/routes/terrain';
import {
    update as reportUpdate,
    submit as reportSubmit,
    flag as reportFlag,
} from '@/routes/terrain/report';
import { checkout as visitCheckout } from '@/routes/terrain/visit';
import {
    checkoutOffline,
    offlineSaveFailed,
    saveReportOffline,
    submitReportOffline,
} from '@/lib/terrain-offline';
import { externalPayload } from '@/components/terrain/external-sales-editor';
import {
    type Report,
    type VisitInfo,
    formatMoney,
} from '@/components/terrain/report/types';
import { type ReportState } from '@/components/terrain/report/use-report-state';

/**
 * Envois du rapport : brouillon, soumission, signalement et fin de service.
 * Sans réseau (ou si la journée attend déjà le réseau), tout passe par la file du téléphone.
 */
export function useReportActions(visit: VisitInfo, state: ReportState) {
    const {
        isSubmitted,
        online,
        waiting,
        visitRef,
        queued,
        setQueuedNow,
        mustQueue,
        provisional,
        unsynced,
        setUnsynced,
        lines,
        notes,
        incidentNotes,
        counted,
        reasons,
        externalShops,
        setBusy,
        setStep,
        setConfirmCheckout,
        totalRevenue,
        countOf,
        hasGap,
        payloadPacks,
        payloadLines,
        forgetDraft,
    } = state;

    function saveDraft({ silent = false } = {}) {
        const draft = {
            notes,
            lines: payloadLines(),
            packs: payloadPacks(),
            external_sales: externalPayload(externalShops),
        };

        if (mustQueue()) {
            saveReportOffline(visitRef, draft)
                .then(() => {
                    if (!silent)
                        toast.info('Saisie gardée sur ce téléphone', {
                            description:
                                'Elle sera envoyée toute seule au retour du réseau.',
                        });
                })
                .catch(() => offlineSaveFailed('Votre saisie'));

            return;
        }

        router.put(reportUpdate({ visit: visit.uuid }).url, draft, {
            // La saisie reste à l'écran : rien n'est rechargé
            preserveState: true,
            preserveScroll: true,
            onStart: () => setBusy('draft'),
            onSuccess: () => {
                forgetDraft();
                setUnsynced(false);
                toast.success(
                    silent
                        ? 'Saisie envoyée au retour du réseau'
                        : 'Brouillon enregistré',
                );
            },
            onError: toastFormError,
            // Réseau faible : la saisie part dans la file et repartira toute seule
            onNetworkError: () => {
                saveReportOffline(visitRef, draft)
                    .then(() => {
                        if (!silent)
                            toast.info('Réseau instable', {
                                description:
                                    'Votre saisie est gardée sur ce téléphone et repartira toute seule.',
                            });
                    })
                    .catch(() => offlineSaveFailed('Votre saisie'));

                return false;
            },
            onFinish: () => setBusy(null),
        });
    }

    // Retour du réseau : la saisie gardée sur le téléphone part toute seule
    useEffect(() => {
        if (
            online &&
            unsynced &&
            !isSubmitted &&
            !queued &&
            waiting.length === 0
        ) {
            saveDraft({ silent: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [online]);

    function submitReport() {
        const payload = {
            notes,
            incident_notes: incidentNotes || null,
            lines: lines.map((l) => ({
                id: l.id,
                site_product_id: l.site_product_id ?? null,
                units_sold: l.units_sold,
                notes: l.notes,
                // Hors ligne, seul un comptage saisi fait foi : le stock du serveur a pu bouger depuis
                counted_stock:
                    provisional &&
                    (counted[l.id] === undefined || counted[l.id] === '')
                        ? null
                        : countOf(l),
                gap_reason: hasGap(l) ? reasons[l.id] : null,
            })),
            packs: payloadPacks(),
            external_sales: externalPayload(externalShops),
        };

        // « Rapport prêt » seulement une fois le rapport réellement gardé sur le téléphone
        const queueForLater = () => {
            setBusy('submit');
            submitReportOffline(visitRef, payload)
                .then(() => {
                    setQueuedNow(true);
                    haptic('success');
                    toast.success('Rapport prêt', {
                        description:
                            'Il partira tout seul dès que le réseau revient.',
                    });
                })
                .catch(() => offlineSaveFailed('Le rapport'))
                .finally(() => setBusy(null));
        };

        if (mustQueue()) {
            queueForLater();

            return;
        }

        router.post(reportSubmit({ visit: visit.uuid }).url, payload, {
            onNetworkError: () => {
                queueForLater();

                return false;
            },
            onStart: () => setBusy('submit'),
            onSuccess: () => {
                forgetDraft();
                haptic('success');
                toast.success('Rapport soumis !', {
                    description: `${formatMoney(totalRevenue)} FCFA enregistrés.`,
                });
            },
            onError: toastFormError,
            onFinish: () => setBusy(null),
        });
    }

    function submitFlag() {
        router.post(
            reportFlag({ visit: visit.uuid }).url,
            { incident_notes: incidentNotes },
            {
                preserveScroll: true,
                onStart: () => setBusy('flag'),
                onSuccess: () => {
                    toast.success('Signalement envoyé');
                    setStep('edit');
                },
                onError: toastFormError,
                onFinish: () => setBusy(null),
            },
        );
    }

    function checkoutAndGo() {
        if (visit.status !== 'in_progress') return;
        setBusy('checkout');
        const doCheckout = (lat?: number, lng?: number) => {
            // Sans réseau : fin de service gardée sur le téléphone, avec l'heure et la position du moment
            const withoutNetwork = () => {
                checkoutOffline(visitRef, {
                    latitude: lat ?? null,
                    longitude: lng ?? null,
                })
                    .then(() => {
                        haptic('success');
                        toast.success('Service terminé !', {
                            description:
                                'Enregistré sur ce téléphone, envoyé dès le retour du réseau.',
                        });
                        setConfirmCheckout(false);
                        router.visit(terrainHome().url);
                    })
                    // Le bouton ne tourne plus sans fin : la fin de service peut être retentée
                    .catch(() => offlineSaveFailed('La fin de service'))
                    .finally(() => setBusy(null));
            };

            if (mustQueue()) {
                withoutNetwork();

                return;
            }

            router.patch(
                visitCheckout({ visit: visit.uuid }).url,
                { latitude: lat ?? null, longitude: lng ?? null },
                {
                    onSuccess: () => {
                        haptic('success');
                        toast.success('Service terminé !');
                        setConfirmCheckout(false);
                    },
                    onError: toastFormError,
                    onNetworkError: () => {
                        withoutNetwork();

                        return false;
                    },
                    onFinish: () => setBusy(null),
                },
            );
        };
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (p) => doCheckout(p.coords.latitude, p.coords.longitude),
                () => doCheckout(),
                { timeout: 8000 },
            );
        } else {
            doCheckout();
        }
    }

    return { saveDraft, submitReport, submitFlag, checkoutAndGo };
}

export type ReportActions = ReturnType<typeof useReportActions>;

/** Propriétés communes aux sections de la page. */
export type ReportViewProps = {
    visit: VisitInfo;
    report: Report;
    state: ReportState;
    actions: ReportActions;
};
