import { Link } from '@inertiajs/react';
import { ArrowLeftRight, CalendarRange, Clock, Users, X } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { StatusBadge } from '@/components/page/status-badge';
import { show as personnelShow } from '@/routes/personnel';
import type { SiteAffectation } from '@/types';
import {
    type HostessRecord,
    type AssignState,
} from '@/components/sites/show/types';
import { Section, Avatar } from '@/components/sites/show/ui';

/* ───────────── Onglet Équipe ───────────── */

type TeamTabProps = {
    affectations: SiteAffectation[];
    hostess_history: HostessRecord[];
    readOnly: boolean;
    assignButton: React.ReactNode;
    setAssign: (state: AssignState) => void;
    removeAffectation: { ask: (affectation: SiteAffectation) => void };
};

export function TeamTab({
    affectations,
    hostess_history,
    readOnly,
    assignButton,
    setAssign,
    removeAffectation,
}: TeamTabProps) {
    return (
        <div className="flex flex-col gap-6">
            <Section
                title="Affectées actuellement"
                description="Les membres en poste sur ce site."
                actions={assignButton}
            >
                {affectations.length === 0 ? (
                    <EmptyState
                        icon={CalendarRange}
                        title="Aucune affectation"
                        description="Personne n'est encore affecté à ce site."
                        action={assignButton}
                    />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {affectations.map((a) => (
                            <li
                                key={a.id}
                                className="flex items-center gap-4 px-5 py-4"
                            >
                                <Avatar name={a.agent_name} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                            href={
                                                personnelShow({
                                                    personnel: a.agent_uuid,
                                                }).url
                                            }
                                            className="text-sm font-semibold text-ink hover:text-motriks-deep"
                                        >
                                            {a.agent_name}
                                        </Link>
                                        {a.is_current && (
                                            <StatusBadge tone="success">
                                                En poste
                                            </StatusBadge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {a.agent_phone && `${a.agent_phone} · `}
                                        Depuis le {a.starts_on}
                                        {a.ends_on &&
                                            ` · jusqu'au ${a.ends_on}`}
                                    </p>
                                    {a.slot_start && a.slot_end && (
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                            <Clock className="size-3" />
                                            {a.slot_start} – {a.slot_end}
                                        </p>
                                    )}
                                </div>
                                {!readOnly && (
                                    <div className="flex shrink-0 gap-1">
                                        <ActionButton
                                            variant="secondary"
                                            size="icon"
                                            icon={<ArrowLeftRight />}
                                            title="Permuter"
                                            aria-label="Permuter"
                                            className="hover:border-green-200 hover:bg-green-50 hover:text-motriks-deep"
                                            onClick={() =>
                                                setAssign({
                                                    open: true,
                                                    mode: 'permuter',
                                                    replacingUuid: a.uuid,
                                                    replacingName: a.agent_name,
                                                })
                                            }
                                        />
                                        <ActionButton
                                            variant="icon-danger"
                                            size="icon"
                                            icon={<X />}
                                            title="Retirer"
                                            aria-label="Retirer"
                                            onClick={() =>
                                                removeAffectation.ask(a)
                                            }
                                        />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section
                title="Historique de l'équipe"
                description="Toutes les personnes ayant travaillé sur ce site."
                actions={
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        {hostess_history.length}
                    </span>
                }
            >
                {hostess_history.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Aucun historique"
                        description="Les membres affectés à ce site apparaîtront ici."
                    />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {hostess_history.map((h) => (
                            <li key={h.agent_id}>
                                <Link
                                    href={
                                        personnelShow({
                                            personnel: h.agent_uuid,
                                        }).url
                                    }
                                    className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-green-50/40"
                                >
                                    <Avatar name={h.agent_name} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-ink group-hover:text-motriks-deep">
                                                {h.agent_name}
                                            </span>
                                            {h.is_current && (
                                                <StatusBadge tone="success">
                                                    Actif
                                                </StatusBadge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {h.role_label}
                                            {h.agent_phone &&
                                                ` · ${h.agent_phone}`}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {h.first_date} → {h.last_date}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-semibold text-ink tabular-nums">
                                            {h.visit_count}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            visite
                                            {h.visit_count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        </div>
    );
}
