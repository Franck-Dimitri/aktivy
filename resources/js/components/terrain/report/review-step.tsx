import { ArrowLeft, Send, TriangleAlert } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { TextArea } from '@/components/page/form-fields';
import { SurfaceCard } from '@/components/page/surface';
import { twoCol } from '@/components/terrain/report/types';
import { Notice } from '@/components/terrain/report/report-ui';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';
import { ReviewTicket } from '@/components/terrain/report/review-ticket';
import { StockCheckCard } from '@/components/terrain/report/stock-check-card';

/* ══════ RÉVISION ══════ */

export function ReviewStep({ visit, report, state, actions }: ReportViewProps) {
    const {
        queued,
        lines,
        incidentNotes,
        setIncidentNotes,
        busy,
        setStep,
        externalBlocking,
        missingReason,
    } = state;
    const { submitReport } = actions;

    return (
        <div className={twoCol}>
            <div className="flex min-w-0 flex-col gap-6">
                {/* Ticket */}
                <ReviewTicket
                    visit={visit}
                    report={report}
                    state={state}
                    actions={actions}
                />

                {lines.length > 0 && (
                    <StockCheckCard
                        visit={visit}
                        report={report}
                        state={state}
                        actions={actions}
                    />
                )}
            </div>

            <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                <Notice tone="warning" icon={TriangleAlert}>
                    Vérifiez vos données avant de soumettre.{' '}
                    <strong>Le rapport ne pourra plus être modifié.</strong>
                </Notice>

                <SurfaceCard contentClassName="p-5">
                    <label
                        htmlFor="incident"
                        className="text-base font-semibold text-ink"
                    >
                        Signaler un incident
                    </label>
                    <p className="mt-0.5 mb-3 text-sm text-slate-500">
                        Optionnel : rupture de stock, problème client, matériel
                        manquant…
                    </p>
                    <TextArea
                        id="incident"
                        rows={4}
                        value={incidentNotes}
                        onChange={(e) => setIncidentNotes(e.target.value)}
                        placeholder="Décrivez l'incident…"
                    />
                </SurfaceCard>

                <div className="flex flex-col gap-2.5">
                    {missingReason && (
                        <p className="text-sm font-medium text-amber-700">
                            Indiquez le motif de chaque écart de stock pour
                            soumettre.
                        </p>
                    )}
                    {externalBlocking && (
                        <p className="text-sm font-medium text-amber-700">
                            Boutiques extérieures : donnez un nom à chaque
                            boutique et choisissez chaque produit.
                        </p>
                    )}
                    <ActionButton
                        onClick={submitReport}
                        loading={busy === 'submit'}
                        disabled={
                            busy !== null ||
                            missingReason ||
                            externalBlocking ||
                            queued
                        }
                        icon={<Send />}
                        className="h-12 w-full rounded-2xl text-base"
                    >
                        {busy === 'submit'
                            ? 'Soumission…'
                            : 'Soumettre le rapport'}
                    </ActionButton>
                    <ActionButton
                        variant="secondary"
                        onClick={() => setStep('edit')}
                        disabled={busy !== null}
                        icon={<ArrowLeft />}
                        className="h-11 w-full rounded-2xl"
                    >
                        Modifier mes saisies
                    </ActionButton>
                </div>
            </div>
        </div>
    );
}
