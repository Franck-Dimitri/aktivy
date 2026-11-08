import { Link } from '@inertiajs/react';
import { Activity, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { index as auditIndex } from '@/routes/admin/audit';
import { index as trafficIndex } from '@/routes/admin/traffic';

/**
 * Onglets du journal : l'activité de la plateforme (actions, connexions) et le trafic du site public.
 * Liens Inertia : chaque volet a sa propre adresse, partageable et conservée au rechargement.
 */
export function AuditTabs({ current }: { current: 'activity' | 'traffic' }) {
    const tabs = [
        { key: 'activity', label: 'Activité', icon: ScrollText, href: auditIndex().url },
        { key: 'traffic', label: 'Trafic du site', icon: Activity, href: trafficIndex().url },
    ] as const;

    return (
        <nav aria-label="Volets du journal" className="inline-flex rounded-xl bg-slate-100/80 p-1 dark:bg-white/5">
            {tabs.map((tab) => {
                const active = tab.key === current;

                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        preserveScroll
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-motriks/30 focus-visible:outline-none',
                            active ? 'bg-white text-ink shadow-sm ring-1 ring-slate-900/5 dark:bg-card' : 'text-slate-500 hover:text-ink',
                        )}
                    >
                        <tab.icon className="size-4" />
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
