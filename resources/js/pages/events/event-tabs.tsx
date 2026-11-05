import { cn } from '@/lib/utils';
import type { TabId } from './types';

type Props = {
    active: TabId;
    onChange: (t: TabId) => void;
    counts: { pdv: number; packs: number; hotesses: number; ventes: number };
};

const TABS: { id: TabId; label: string; countKey?: keyof Props['counts'] }[] = [
    { id: 'apercu', label: 'Aperçu' },
    { id: 'pdv', label: 'Points de vente', countKey: 'pdv' },
    { id: 'packs', label: 'Packs', countKey: 'packs' },
    { id: 'hotesses', label: 'Hôtesses', countKey: 'hotesses' },
    { id: 'ventes', label: 'Ventes', countKey: 'ventes' },
];

/** Onglets soulignés, défilables sur mobile. */
export function EventTabs({ active, onChange, counts }: Props) {
    return (
        <div role="tablist" aria-label="Rubriques de l’événement" className="-mx-4 flex gap-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0 dark:border-sidebar-border">
            {TABS.map((t) => {
                const count = t.countKey ? counts[t.countKey] : undefined;
                const selected = active === t.id;

                return (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(t.id)}
                        className={cn(
                            'relative flex h-11 shrink-0 items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none',
                            selected ? 'text-ink' : 'text-slate-500 hover:text-ink',
                        )}
                    >
                        {t.label}
                        {count !== undefined && (
                            <span className={cn('rounded-md px-1.5 text-[11px] font-semibold tabular-nums', selected ? 'bg-motriks-soft text-motriks-deep' : 'bg-slate-100 text-slate-500 dark:bg-white/5')}>
                                {count}
                            </span>
                        )}
                        <span aria-hidden className={cn('absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors', selected ? 'bg-motriks' : 'bg-transparent')} />
                    </button>
                );
            })}
        </div>
    );
}
