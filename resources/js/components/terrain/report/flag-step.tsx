import { ArrowLeft, Megaphone } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { TextArea } from '@/components/page/form-fields';
import { SurfaceCard } from '@/components/page/surface';
import { twoCol } from '@/components/terrain/report/types';
import { type ReportViewProps } from '@/components/terrain/report/use-report-actions';

/* ══════ SIGNALEMENT POST-SOUMISSION ══════ */

export function FlagStep({ state, actions }: ReportViewProps) {
    const { incidentNotes, setIncidentNotes, busy, setStep } = state;
    const { submitFlag } = actions;

    return (
        <div className={twoCol}>
            <SurfaceCard contentClassName="p-5 sm:p-6">
                <label
                    htmlFor="flag"
                    className="text-base font-semibold text-ink"
                >
                    Signalement / Correction
                </label>
                <p className="mt-0.5 mb-3 text-sm text-slate-500">
                    Décrivez le problème. Votre responsable en sera informé.
                </p>
                <TextArea
                    id="flag"
                    rows={7}
                    value={incidentNotes}
                    onChange={(e) => setIncidentNotes(e.target.value)}
                    placeholder="Erreur de saisie, rupture non signalée, problème client…"
                />
            </SurfaceCard>
            <div className="flex flex-col gap-2.5 lg:sticky lg:top-6">
                <ActionButton
                    onClick={submitFlag}
                    loading={busy === 'flag'}
                    disabled={busy !== null || !incidentNotes.trim()}
                    icon={<Megaphone />}
                    className="h-12 w-full rounded-2xl bg-amber-500 text-base shadow-amber-400/30 hover:bg-amber-600"
                >
                    {busy === 'flag' ? 'Envoi…' : 'Envoyer le signalement'}
                </ActionButton>
                <ActionButton
                    variant="secondary"
                    icon={<ArrowLeft />}
                    onClick={() => setStep('edit')}
                    className="h-11 w-full rounded-2xl"
                >
                    Retour
                </ActionButton>
            </div>
        </div>
    );
}
