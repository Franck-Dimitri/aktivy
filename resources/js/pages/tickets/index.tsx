import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Inbox,
    MessageCircleQuestion,
    MessageSquareReply,
    Search,
    Siren,
} from 'lucide-react';
import { useState } from 'react';
import { TextInput } from '@/components/page/form-fields';
import { MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { useListQuery } from '@/components/page/list-query';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { StatusBadge } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { index as ticketsIndex } from '@/routes/tickets';
import { TicketModal } from './ticket-modal';
import { initials, STATUS, type Ticket } from './ticket-types';

type Filter = 'pending' | 'unanswered' | 'closed' | 'all';

function TicketCard({
    ticket,
    onOpen,
}: {
    ticket: Ticket;
    onOpen: () => void;
}) {
    const urgent = ticket.priority === 'urgent' && ticket.status !== 'closed';
    const closed = ticket.status === 'closed';
    const agent = ticket.agent_name ?? 'Compte supprimé';

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className={cn(
                    'group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm shadow-slate-900/[0.03] transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:shadow-slate-900/[0.06] focus-visible:ring-4 focus-visible:ring-motriks/20 focus-visible:outline-none sm:p-5',
                    urgent
                        ? 'border-red-200 hover:border-red-300'
                        : 'border-slate-200/80 hover:border-slate-300',
                    closed && 'bg-slate-50/50',
                )}
            >
                {urgent && (
                    <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1 bg-red-500"
                    />
                )}

                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        closed
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-motriks-soft text-motriks-deep',
                    )}
                >
                    {initials(agent)}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p
                                className={cn(
                                    'truncate text-sm font-semibold',
                                    closed ? 'text-slate-500' : 'text-ink',
                                )}
                            >
                                {ticket.subject}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                {agent} · {ticket.created_at}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            {urgent && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/15 ring-inset">
                                    <Siren className="size-3" />
                                    Urgent
                                </span>
                            )}
                            <StatusBadge tone={STATUS[ticket.status].tone}>
                                {STATUS[ticket.status].label}
                            </StatusBadge>
                        </div>
                    </div>

                    <p
                        className={cn(
                            'mt-2.5 line-clamp-2 text-sm leading-relaxed',
                            closed ? 'text-slate-500' : 'text-slate-600',
                        )}
                    >
                        {ticket.body}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                        {ticket.response ? (
                            <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                                <MessageSquareReply className="size-3.5 shrink-0 text-motriks" />
                                <span className="truncate">
                                    <span className="font-medium text-slate-600">
                                        {ticket.responder ?? 'Réponse'} :
                                    </span>{' '}
                                    {ticket.response}
                                </span>
                            </p>
                        ) : (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                <AlertCircle className="size-3.5" />
                                Sans réponse
                            </p>
                        )}
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-motriks-deep opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100">
                            {closed
                                ? 'Voir'
                                : ticket.response
                                  ? 'Suivre'
                                  : 'Répondre'}
                            <ChevronRight className="size-3.5" />
                        </span>
                    </div>
                </div>
            </button>
        </li>
    );
}

type Props = {
    /** Page de demandes déjà filtrée par le serveur (onglet et recherche de l'URL). */
    tickets: Paginated<Ticket>;
    filters: { filtre: Filter; q: string };
    /** Compteurs sur toutes les demandes visibles, pas seulement la page affichée. */
    counts: Record<Filter, number> & { urgent: number };
};

export default function TicketsIndex({ tickets, filters, counts }: Props) {
    const [openId, setOpenId] = useState<number | null>(null);
    // « À traiter » est l'onglet par défaut : il reste hors de l'URL
    const list = useListQuery(ticketsIndex().url, {
        ...filters,
        filtre: filters.filtre === 'pending' ? null : filters.filtre,
    });
    const filter = filters.filtre;
    const setFilter = (value: Filter) =>
        list.apply({ filtre: value === 'pending' ? null : value });

    const pending = counts.pending;
    const unanswered = counts.unanswered;
    const urgent = counts.urgent;
    const closed = counts.closed;
    const shown = tickets.data;

    // Le ticket ouvert est relu dans les props, pour refléter une mise à jour
    const opened = shown.find((t) => t.id === openId) ?? null;

    return (
        <>
            <Head title="Tickets" />

            <Page
                title="Tickets"
                description="Les demandes de votre équipe terrain, et vos réponses."
            >
                {counts.all === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white">
                        <QuietEmpty
                            icon={MessageCircleQuestion}
                            title="Aucune demande pour le moment"
                        >
                            Les demandes envoyées par vos hôtesses depuis leur
                            espace terrain apparaîtront ici.
                        </QuietEmpty>
                    </div>
                ) : (
                    <>
                        <MetricRow
                            items={[
                                {
                                    label: 'À traiter',
                                    value: pending,
                                    hint: 'Ouvertes ou en cours',
                                    icon: Inbox,
                                    tone: pending ? 'blue' : 'default',
                                },
                                {
                                    label: 'Sans réponse',
                                    value: unanswered,
                                    hint: 'À traiter en priorité',
                                    icon: AlertCircle,
                                    tone: unanswered ? 'amber' : 'default',
                                    pulse: true,
                                },
                                {
                                    label: 'Urgentes',
                                    value: urgent,
                                    hint: 'Parmi celles à traiter',
                                    icon: Siren,
                                    tone: urgent ? 'red' : 'default',
                                },
                                {
                                    label: 'Résolues',
                                    value: closed,
                                    hint: 'Demandes fermées',
                                    icon: CheckCircle2,
                                    tone: 'green',
                                },
                            ]}
                        />

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Segmented
                                label="Filtrer les demandes"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    {
                                        value: 'pending',
                                        label: 'À traiter',
                                        count: pending,
                                    },
                                    {
                                        value: 'unanswered',
                                        label: 'Sans réponse',
                                        count: unanswered,
                                    },
                                    {
                                        value: 'closed',
                                        label: 'Résolues',
                                        count: closed,
                                    },
                                    {
                                        value: 'all',
                                        label: 'Toutes',
                                        count: counts.all,
                                    },
                                ]}
                            />
                            <div className="sm:w-72">
                                <TextInput
                                    icon={Search}
                                    value={list.search}
                                    onChange={(e) =>
                                        list.setSearch(e.target.value)
                                    }
                                    placeholder="Sujet, message ou hôtesse"
                                    aria-label="Rechercher une demande"
                                    className="h-9"
                                />
                            </div>
                        </div>

                        {shown.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200/80 bg-white">
                                {filters.q ? (
                                    <QuietEmpty
                                        icon={Search}
                                        title="Aucune demande ne correspond"
                                    >
                                        Modifiez la recherche ou le filtre.
                                    </QuietEmpty>
                                ) : (
                                    <QuietEmpty
                                        icon={CheckCircle2}
                                        title={
                                            filter === 'closed'
                                                ? 'Aucune demande résolue'
                                                : 'Tout est traité'
                                        }
                                    >
                                        {filter === 'closed'
                                            ? 'Les demandes que vous résolvez apparaîtront ici.'
                                            : 'Aucune demande n’attend de réponse. Bravo à l’équipe !'}
                                    </QuietEmpty>
                                )}
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {shown.map((t) => (
                                    <TicketCard
                                        key={t.id}
                                        ticket={t}
                                        onOpen={() => setOpenId(t.id)}
                                    />
                                ))}
                            </ul>
                        )}

                        {tickets.last_page > 1 && (
                            <Pagination page={tickets} className="px-0 py-0" />
                        )}
                    </>
                )}
            </Page>

            {opened && (
                <TicketModal
                    key={opened.id}
                    ticket={opened}
                    onClose={() => setOpenId(null)}
                />
            )}
        </>
    );
}

TicketsIndex.layout = {
    breadcrumbs: [{ title: 'Tickets', href: ticketsIndex().url }],
};
