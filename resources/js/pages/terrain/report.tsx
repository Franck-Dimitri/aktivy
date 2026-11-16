import { Head } from '@inertiajs/react';
import { ArrowLeft, Flag } from 'lucide-react';
import { ActionLink } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Page } from '@/components/page/page';
import { home as terrainHome } from '@/routes/terrain';
import { type Report, type VisitInfo } from '@/components/terrain/report/types';
import { useReportState } from '@/components/terrain/report/use-report-state';
import { useReportActions } from '@/components/terrain/report/use-report-actions';
import { ReportHeader } from '@/components/terrain/report/report-header';
import { EditStep } from '@/components/terrain/report/edit-step';
import { ReviewStep } from '@/components/terrain/report/review-step';
import { SubmittedView } from '@/components/terrain/report/submitted-view';
import { FlagStep } from '@/components/terrain/report/flag-step';

/* ─── Page ─── */

export default function TerrainReport({
    visit,
    report,
}: {
    visit: VisitInfo;
    report: Report;
}) {
    // État et envois du rapport : components/terrain/report (logique hors ligne comprise)
    const state = useReportState(visit, report);
    const actions = useReportActions(visit, state);
    const {
        isSubmitted,
        isEditing,
        step,
        busy,
        confirmCheckout,
        setConfirmCheckout,
    } = state;
    const view = { visit, report, state, actions };

    return (
        <>
            <Head title="Rapport journalier" />

            <Page
                title={report.site_name}
                description={`Rapport du ${report.report_date}`}
                actions={
                    <ActionLink
                        href={terrainHome().url}
                        variant="secondary"
                        icon={<ArrowLeft />}
                    >
                        Tableau de bord
                    </ActionLink>
                }
            >
                <div className="flex w-full flex-col gap-6">
                    <ReportHeader {...view} />

                    {/* ══════ SAISIE ══════ */}
                    {isEditing && <EditStep {...view} />}

                    {/* ══════ RÉVISION ══════ */}
                    {!isSubmitted && step === 'review' && (
                        <ReviewStep {...view} />
                    )}

                    {/* ══════ SOUMIS : lecture seule ══════ */}
                    {isSubmitted && step !== 'incident' && (
                        <SubmittedView {...view} />
                    )}

                    {/* ══════ SIGNALEMENT POST-SOUMISSION ══════ */}
                    {isSubmitted && step === 'incident' && (
                        <FlagStep {...view} />
                    )}
                </div>
            </Page>

            <ConfirmDialog
                open={confirmCheckout}
                onOpenChange={setConfirmCheckout}
                title="Terminer votre service ?"
                description="Votre heure de départ et votre position seront enregistrées."
                confirmLabel="Terminer mon service"
                icon={Flag}
                tone="primary"
                loading={busy === 'checkout'}
                onConfirm={actions.checkoutAndGo}
            />
        </>
    );
}

TerrainReport.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: terrainHome().url },
        { title: 'Rapport du jour' },
    ],
};
