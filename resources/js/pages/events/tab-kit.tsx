import { Check, Search, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { cn } from '@/lib/utils';

/* Briques communes des onglets de l'événement (points de vente, packs, hôtesses). */

/** Barre d'en-tête d'un onglet : résumé à gauche, action principale à droite. */
export function TabToolbar({ summary, action }: { summary: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{summary}</p>
            {action}
        </div>
    );
}

/** État vide d'un onglet, avec son action. */
export function TabEmpty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
    return (
        <section className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-motriks-soft text-motriks-deep ring-8 ring-motriks-soft/40">
                <Icon className="size-5" />
            </span>
            <h3 className="mt-5 text-[15px] font-semibold text-ink">{title}</h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{text}</p>
            {action && <div className="mt-5">{action}</div>}
        </section>
    );
}

/** Choix entre deux façons d'ajouter (élément existant / nouveau), en cartes radio. */
export function ModeCards<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; title: string; text: string; icon: LucideIcon }[] }) {
    return (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {options.map((o) => {
                const active = o.value === value;
                const Icon = o.icon;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-motriks/30 focus-visible:outline-none',
                            active ? 'border-motriks/40 bg-motriks-soft/60' : 'border-slate-200 hover:border-slate-300 dark:border-sidebar-border',
                        )}
                    >
                        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-motriks text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/5')}>
                            <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className={cn('block text-sm font-semibold', active ? 'text-motriks-deep' : 'text-ink')}>{o.title}</span>
                            <span className="mt-0.5 block text-xs leading-snug text-slate-500">{o.text}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export type PickItem = { id: number; title: string; subtitle?: string | null };

/** Liste à choix unique avec recherche (plus lisible qu'une liste déroulante sur téléphone). */
export function PickList({ items, value, onChange, empty, searchPlaceholder }: { items: PickItem[]; value: number | null; onChange: (id: number) => void; empty: string; searchPlaceholder: string }) {
    const [query, setQuery] = useState('');
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? items.filter((i) => `${i.title} ${i.subtitle ?? ''}`.toLowerCase().includes(q)) : items;
    }, [items, query]);

    if (items.length === 0) {
        return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-white/[0.03]">{empty}</p>;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-sidebar-border">
            {items.length > 5 && (
                <div className="relative border-b border-slate-100 dark:border-sidebar-border">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        className="h-11 w-full bg-transparent pr-3 pl-10 text-base text-ink outline-none placeholder:text-slate-400 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                    />
                </div>
            )}
            <ul role="listbox" className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-sidebar-border">
                {shown.map((i) => {
                    const active = value === i.id;
                    return (
                        <li key={i.id}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => onChange(i.id)}
                                className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors', active ? 'bg-motriks-soft/60' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]')}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className={cn('block truncate text-sm font-medium', active ? 'text-motriks-deep' : 'text-ink')}>{i.title}</span>
                                    {i.subtitle && <span className="block truncate text-xs text-slate-500">{i.subtitle}</span>}
                                </span>
                                <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', active ? 'border-motriks bg-motriks text-white' : 'border-slate-300 dark:border-sidebar-border')}>
                                    {active && <Check className="size-3" strokeWidth={3} />}
                                </span>
                            </button>
                        </li>
                    );
                })}
                {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Aucun résultat.</li>}
            </ul>
        </div>
    );
}

/** Pied de modal : Annuler + action principale. */
export function ModalFooter({ onCancel, processing, submitLabel, icon, disabled }: { onCancel: () => void; processing: boolean; submitLabel: string; icon?: ReactNode; disabled?: boolean }) {
    return (
        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-sidebar-border dark:bg-card">
            <ActionButton variant="secondary" onClick={onCancel} disabled={processing}>
                Annuler
            </ActionButton>
            <ActionButton type="submit" icon={icon} loading={processing} disabled={disabled}>
                {submitLabel}
            </ActionButton>
        </footer>
    );
}
