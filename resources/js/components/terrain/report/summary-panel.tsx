import { ArrowRight, Save } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { TextArea } from '@/components/page/form-fields';
import { SurfaceCard } from '@/components/page/surface';
import { type Busy, formatMoney } from '@/components/terrain/report/types';

/* ─── Panneau récapitulatif (colonne de droite) ─── */

export function SummaryPanel({
    totalSold,
    totalRevenue,
    filledCount,
    totalLines,
    remainingStock,
    notes,
    onNotes,
    busy,
    onSave,
    onReview,
}: {
    totalSold: number;
    totalRevenue: number;
    filledCount: number;
    totalLines: number;
    remainingStock: number;
    notes: string;
    onNotes: (v: string) => void;
    busy: Busy;
    onSave: () => void;
    onReview: () => void;
}) {
    const pct =
        totalLines > 0 ? Math.round((filledCount / totalLines) * 100) : 0;

    return (
        <SurfaceCard contentClassName="flex flex-col gap-5 p-5 sm:p-6">
            <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Total de la journée
                </p>
                <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-4xl font-extrabold tracking-tight text-ink tabular-nums">
                    <span className="whitespace-nowrap">
                        {formatMoney(totalRevenue)}
                    </span>
                    <span className="text-base font-medium text-slate-500">
                        FCFA
                    </span>
                </p>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                        Produits saisis
                    </span>
                    <span className="font-semibold text-ink tabular-nums">
                        {filledCount}/{totalLines}
                    </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-motriks transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <dt className="text-xs text-slate-500">Unités vendues</dt>
                    <dd className="mt-1 text-xl font-bold text-ink tabular-nums">
                        {totalSold}
                    </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <dt className="text-xs text-slate-500">Stock restant</dt>
                    <dd className="mt-1 text-xl font-bold text-ink tabular-nums">
                        {remainingStock}
                    </dd>
                </div>
            </dl>

            <div className="border-t border-slate-100 pt-5">
                <label
                    htmlFor="day-notes"
                    className="text-sm font-semibold text-ink"
                >
                    Notes du jour{' '}
                    <span className="font-normal text-slate-500">
                        (facultatif)
                    </span>
                </label>
                <TextArea
                    id="day-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="Événements particuliers, remarques clients…"
                    className="mt-2"
                />
            </div>

            <div className="flex flex-col gap-2.5">
                <ActionButton
                    onClick={onReview}
                    disabled={busy !== null}
                    icon={<ArrowRight className="order-last" />}
                    className="h-12 w-full rounded-2xl text-base"
                >
                    Réviser et soumettre
                </ActionButton>
                <ActionButton
                    variant="secondary"
                    onClick={onSave}
                    loading={busy === 'draft'}
                    disabled={busy !== null}
                    icon={<Save />}
                    className="h-11 w-full rounded-2xl"
                >
                    {busy === 'draft'
                        ? 'Sauvegarde…'
                        : 'Enregistrer le brouillon'}
                </ActionButton>
            </div>
        </SurfaceCard>
    );
}
