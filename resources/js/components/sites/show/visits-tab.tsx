import { Clock, Timer } from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { StatusBadge } from '@/components/page/status-badge';
import type { SiteVisit } from '@/types';
import { formatDuration } from '@/lib/format';
import { statusTone } from '@/components/sites/show/constants';
import { Section, Avatar } from '@/components/sites/show/ui';

/* ───────────── Onglet Visites ───────────── */

export function VisitsTab({ recent_visits }: { recent_visits: SiteVisit[] }) {
    return (
        <Section
            title="Visites récentes"
            description="Les 10 dernières prises de poste sur ce site."
        >
            {recent_visits.length === 0 ? (
                <EmptyState
                    icon={Timer}
                    title="Aucune visite enregistrée"
                    description="Les pointages de vos hôtesses apparaîtront ici."
                />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {recent_visits.map((visit) => (
                        <li
                            key={visit.id}
                            className="flex items-center gap-4 px-5 py-3.5 text-sm"
                        >
                            <Avatar name={visit.agent_name ?? '?'} size="sm" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-ink">
                                    {visit.agent_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {visit.checked_in_at}
                                    {visit.checked_out_at &&
                                        ` → ${visit.checked_out_at}`}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                {visit.duration_minutes != null && (
                                    <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                                        <Clock className="size-3" />
                                        {formatDuration(
                                            visit.duration_minutes,
                                            {
                                                zeroIsEmpty: true,
                                            },
                                        )}
                                    </span>
                                )}
                                <StatusBadge
                                    tone={statusTone[visit.status] ?? 'neutral'}
                                >
                                    {visit.status_label}
                                </StatusBadge>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    );
}
