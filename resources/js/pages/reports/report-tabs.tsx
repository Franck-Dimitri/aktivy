import { Link } from '@inertiajs/react';
import { BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { index as reportsIndex, objectives as reportsObjectives } from '@/routes/reports';

/** Onglets de « Ventes & objectifs » : deux pages, un seul lien dans le menu. */
export function ReportTabs({ active }: { active: 'sales' | 'objectives' }) {
    const tabs = [
        { id: 'sales', label: 'Ventes', icon: BarChart3, href: reportsIndex().url },
        { id: 'objectives', label: 'Objectifs', icon: Target, href: reportsObjectives().url },
    ] as const;

    return (
        <nav aria-label="Ventes & objectifs" className="-mx-4 flex gap-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0 dark:border-sidebar-border">
            {tabs.map((t) => {
                const selected = t.id === active;
                const Icon = t.icon;
                return (
                    <Link
                        key={t.id}
                        href={t.href}
                        preserveScroll
                        aria-current={selected ? 'page' : undefined}
                        className={cn('relative flex h-11 shrink-0 items-center gap-2 text-sm font-medium transition-colors', selected ? 'text-ink' : 'text-slate-500 hover:text-ink')}
                    >
                        <Icon className={cn('size-4', selected ? 'text-motriks' : 'text-slate-400')} />
                        {t.label}
                        <span aria-hidden className={cn('absolute inset-x-0 -bottom-px h-0.5 rounded-full', selected ? 'bg-motriks' : 'bg-transparent')} />
                    </Link>
                );
            })}
        </nav>
    );
}
