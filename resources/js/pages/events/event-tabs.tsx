import { cn } from '@/lib/utils';
import type { TabId } from './types';

type Props = {
    active: TabId;
    onChange: (t: TabId) => void;
    counts: { pdv: number; packs: number; hotesses: number; ventes: number };
};

const TABS: { id: TabId; label: string; countKey?: keyof Props['counts'] }[] = [
    { id: 'apercu',   label: 'Aperçu' },
    { id: 'pdv',      label: 'Points de vente', countKey: 'pdv' },
    { id: 'packs',    label: 'Packs produits',  countKey: 'packs' },
    { id: 'hotesses', label: 'Hôtesses',        countKey: 'hotesses' },
    { id: 'ventes',   label: 'Ventes',           countKey: 'ventes' },
];

export function EventTabs({ active, onChange, counts }: Props) {
    return (
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => {
                const count = t.countKey !== undefined ? counts[t.countKey] : undefined;
                return (
                    <button
                        key={t.id}
                        onClick={() => onChange(t.id)}
                        className={cn(
                            'flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            active === t.id
                                ? 'bg-white text-ink shadow-sm'
                                : 'text-slate-500 hover:text-ink',
                        )}
                    >
                        {t.label}
                        {count !== undefined && count > 0 && (
                            <span className={cn(
                                'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
                                active === t.id ? 'bg-motriks text-white' : 'bg-slate-200 text-slate-500',
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
