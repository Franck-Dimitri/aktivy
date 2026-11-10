import { Check, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SelectInput } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';
import type { AffectationSelectOption } from '@/types';

/** Au-delà de ce nombre de points de vente, une recherche s'affiche au-dessus des cases. */
const SEARCH_FROM = 8;

const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

/**
 * Choix des points de vente d'une affectation :
 * - superviseur (multiple) : cases à cocher, « tout sélectionner » et recherche ;
 * - hôtesse : un seul point de vente, celui où elle prend son service.
 */
export function SitePicker({
    id,
    sites,
    multiple,
    value,
    onChange,
    error,
}: {
    id: string;
    sites: AffectationSelectOption[];
    multiple: boolean;
    value: number[];
    onChange: (ids: number[]) => void;
    error?: string;
}) {
    const [query, setQuery] = useState('');

    const shown = useMemo(() => {
        const q = normalize(query.trim());

        return q ? sites.filter((s) => normalize(s.label).includes(q)) : sites;
    }, [sites, query]);

    if (!multiple) {
        return (
            <SelectInput id={id} icon={MapPin} value={value[0] ?? ''} onChange={(e) => onChange(e.target.value ? [Number(e.target.value)] : [])} error={error} required>
                <option value="">Choisir un site…</option>
                {sites.map((s) => (
                    <option key={s.value} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </SelectInput>
        );
    }

    const selected = new Set(value);
    const allShown = shown.length > 0 && shown.every((s) => selected.has(s.value));
    const toggle = (siteId: number) => onChange(selected.has(siteId) ? value.filter((v) => v !== siteId) : [...value, siteId]);
    const toggleShown = () =>
        onChange(allShown ? value.filter((v) => !shown.some((s) => s.value === v)) : [...new Set([...value, ...shown.map((s) => s.value)])]);

    return (
        <div id={id} className={cn('overflow-hidden rounded-xl border bg-white', error ? 'border-red-300' : 'border-slate-200')}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                <p className="text-sm text-slate-600" aria-live="polite">
                    {value.length === 0 ? 'Aucun point de vente coché' : `${value.length} point${value.length > 1 ? 's' : ''} de vente coché${value.length > 1 ? 's' : ''}`}
                </p>
                {shown.length > 0 && (
                    <button type="button" onClick={toggleShown} className="text-sm font-medium text-motriks-deep hover:underline">
                        {allShown ? 'Tout décocher' : query ? 'Cocher les résultats' : 'Tout cocher'}
                    </button>
                )}
            </div>

            {sites.length > SEARCH_FROM && (
                <div className="relative border-b border-slate-100">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher un point de vente ou une ville"
                        aria-label="Rechercher un point de vente"
                        className="h-10 w-full bg-white pr-3 pl-10 text-base text-ink outline-none placeholder:text-slate-400 sm:text-sm"
                    />
                </div>
            )}

            {shown.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">{sites.length === 0 ? 'Aucun point de vente actif.' : 'Aucun point de vente ne correspond.'}</p>
            ) : (
                <ul role="group" aria-label="Points de vente supervisés" className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                    {shown.map((s) => {
                        const checked = selected.has(s.value);

                        return (
                            <li key={s.value}>
                                <label className={cn('flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors', checked ? 'bg-motriks-soft/40' : 'hover:bg-slate-50')}>
                                    <input type="checkbox" checked={checked} onChange={() => toggle(s.value)} className="peer sr-only" />
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-motriks/30',
                                            checked ? 'border-motriks bg-motriks text-white' : 'border-slate-300 bg-white',
                                        )}
                                    >
                                        {checked && <Check className="size-3.5" strokeWidth={3} />}
                                    </span>
                                    <span className={cn('min-w-0 truncate text-sm', checked ? 'font-medium text-ink' : 'text-slate-700')}>{s.label}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/** Erreur de validation des sites, quelle que soit sa clé (site_ids, site_ids.0, site_id). */
export function siteError(errors: Record<string, string | undefined>): string | undefined {
    return errors.site_ids ?? errors.site_id ?? Object.entries(errors).find(([k]) => k.startsWith('site_ids.'))?.[1];
}
