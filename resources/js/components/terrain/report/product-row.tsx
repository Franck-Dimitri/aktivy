import { Minus, Package, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { TextInput } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';
import {
    type ReportLine,
    formatMoney,
} from '@/components/terrain/report/types';
import { StockBar } from '@/components/terrain/report/report-ui';

/* ─── Ligne produit (pleine largeur) ─── */

export function ProductRow({
    line,
    reserved,
    onChange,
    onNoteChange,
    disabled,
}: {
    line: ReportLine;
    /** Unités déjà prises par les packs saisis. */
    reserved: number;
    onChange: (sold: number) => void;
    onNoteChange: (note: string) => void;
    disabled: boolean;
}) {
    const [noteOpen, setNoteOpen] = useState(Boolean(line.notes));
    const active = line.units_sold > 0;
    // Le stock disponible pour les ventes à l'unité tient compte des packs
    const available = line.opening_stock + line.restocked;
    const max = Math.max(0, available - reserved);
    const remaining = Math.max(0, max - line.units_sold);
    const soldOut = line.opening_stock + line.restocked > 0 && remaining === 0;
    const lowStock =
        !soldOut &&
        line.opening_stock > 0 &&
        remaining <= (line.opening_stock + line.restocked) * 0.2;
    const amount = line.units_sold * line.unit_price;

    return (
        <li
            className={cn(
                'p-4 transition-colors sm:p-5',
                active && 'bg-motriks-soft/40',
            )}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                {/* Identité */}
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    {line.image_url ? (
                        <img
                            src={line.image_url}
                            alt={line.product_name}
                            className="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100"
                        />
                    ) : (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                            <Package className="size-6" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="line-clamp-2 font-semibold break-words text-ink">
                                {line.product_name}
                            </p>
                            {soldOut && (
                                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/15 ring-inset">
                                    Épuisé
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {line.unit_price > 0 && (
                                <>
                                    {formatMoney(line.unit_price)} FCFA /{' '}
                                    {line.unit} ·{' '}
                                </>
                            )}
                            stock {line.opening_stock}
                            {line.restocked > 0 &&
                                ` + ${line.restocked} livrés`}
                        </p>
                        {line.opening_stock > 0 && (
                            <div className="mt-2.5 flex items-center gap-3">
                                <StockBar
                                    used={line.units_sold + reserved}
                                    total={available}
                                />
                                <span
                                    className={cn(
                                        'shrink-0 text-[11px] font-medium tabular-nums',
                                        soldOut
                                            ? 'text-red-600'
                                            : lowStock
                                              ? 'text-amber-600'
                                              : 'text-slate-500',
                                    )}
                                >
                                    Reste {remaining}
                                    {reserved > 0 && ` · ${reserved} en packs`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stepper + montant */}
                <div className="flex items-center justify-between gap-3 sm:gap-4 md:justify-end">
                    <div className="inline-flex shrink-0 items-center rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            disabled={disabled || line.units_sold <= 0}
                            onClick={() =>
                                onChange(Math.max(0, line.units_sold - 1))
                            }
                            className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:text-ink focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none active:scale-90 disabled:opacity-40 disabled:shadow-none"
                            aria-label="Retirer une unité"
                        >
                            <Minus className="size-4" />
                        </button>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={max}
                            value={line.units_sold}
                            disabled={disabled}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                                onChange(
                                    Math.max(
                                        0,
                                        Math.min(
                                            max,
                                            Number(e.target.value) || 0,
                                        ),
                                    ),
                                )
                            }
                            aria-label={`Unités vendues — ${line.product_name}`}
                            className="h-11 w-16 [appearance:textfield] bg-transparent text-center text-lg font-bold text-ink tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            disabled={disabled || line.units_sold >= max}
                            onClick={() =>
                                onChange(Math.min(max, line.units_sold + 1))
                            }
                            className="flex size-11 items-center justify-center rounded-xl bg-motriks text-white shadow-sm shadow-green-600/25 transition-all hover:bg-motriks-deep focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-offset-2 focus-visible:outline-none active:scale-90 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            aria-label="Ajouter une unité"
                        >
                            <Plus className="size-4" />
                        </button>
                    </div>

                    <p
                        className={cn(
                            'flex min-w-0 flex-wrap items-baseline justify-end gap-x-1 text-right text-base font-bold tabular-nums md:w-32',
                            amount > 0 ? 'text-motriks-deep' : 'text-slate-300',
                        )}
                    >
                        <span className="whitespace-nowrap">
                            {amount > 0 ? formatMoney(amount) : '—'}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                            FCFA
                        </span>
                    </p>
                </div>
            </div>

            {/* Actions discrètes */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs md:pl-20">
                {!soldOut && line.opening_stock > 0 && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(max)}
                        className="inline-flex min-h-9 items-center font-semibold text-motriks-deep hover:underline focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none disabled:opacity-40"
                    >
                        Tout vendu
                    </button>
                )}
                {active && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(0)}
                        className="inline-flex min-h-9 items-center font-medium text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none disabled:opacity-40"
                    >
                        Remettre à 0
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setNoteOpen((o) => !o)}
                    className="inline-flex min-h-9 items-center gap-1 font-medium text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                >
                    <Pencil className="size-3" />
                    Note
                </button>
            </div>

            {noteOpen && (
                <div className="md:pl-20">
                    <TextInput
                        placeholder="Note sur ce produit (optionnel)"
                        value={line.notes ?? ''}
                        disabled={disabled}
                        onChange={(e) => onNoteChange(e.target.value)}
                        className="mt-1 h-9 bg-white text-xs"
                    />
                </div>
            )}
        </li>
    );
}
