import { Clock, Flag, WifiOff, CloudUpload } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { StatusBadge } from '@/components/page/status-badge';
import { cancelQueuedSubmit } from '@/lib/terrain-offline';
import { Notice, Steps } from '@/components/terrain/report/report-ui';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';

/* ─── En-tête : horaires, statut, progression et avis réseau ─── */

export function ReportHeader({ visit, report, state }: ReportViewProps) {
    const {
        isSubmitted,
        online,
        auth,
        queued,
        setQueuedNow,
        restored,
        unsynced,
        current,
    } = state;

    return (
        <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4 text-slate-400" />
                        Arrivée {visit.checked_in_at}
                    </span>
                    {visit.checked_out_at && (
                        <span className="inline-flex items-center gap-1.5">
                            <Flag className="size-4 text-slate-400" />
                            Départ {visit.checked_out_at}
                        </span>
                    )}
                    {isSubmitted ? (
                        <StatusBadge tone="success">
                            Soumis à {report.submitted_at}
                        </StatusBadge>
                    ) : (
                        <StatusBadge tone="warning">Brouillon</StatusBadge>
                    )}
                </div>
                <div className="w-full md:w-96">
                    <Steps current={current} />
                </div>
            </div>

            {!isSubmitted && queued && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                    <p className="min-w-0 flex-1">
                        <strong>Rapport prêt.</strong> Il partira tout seul au
                        retour du réseau, même si vous fermez cette page.
                    </p>
                    <ActionButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            setQueuedNow(false);
                            void cancelQueuedSubmit(auth.user.id, visit.uuid);
                        }}
                    >
                        Modifier
                    </ActionButton>
                </div>
            )}
            {!isSubmitted && !online && !queued && (
                <Notice tone="warning" icon={WifiOff}>
                    <strong>Pas de réseau.</strong> Continuez votre saisie :
                    elle est gardée sur ce téléphone et sera envoyée au retour
                    du réseau.
                </Notice>
            )}
            {!isSubmitted && online && restored && unsynced && (
                <Notice tone="warning" icon={CloudUpload}>
                    Votre dernière saisie, restée sur ce téléphone, a été
                    reprise. Pensez à l’enregistrer.
                </Notice>
            )}
        </>
    );
}
