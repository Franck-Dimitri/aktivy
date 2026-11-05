import { Head } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, ChevronRight, Inbox, MessageCircleQuestion, MessageSquareReply, Search, Siren } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TextInput } from '@/components/page/form-fields';
import { MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { index as ticketsIndex } from '@/routes/tickets';
import { TicketModal } from './ticket-modal';
import { initials, STATUS, type Ticket } from './ticket-types';

type Filter = 'pending' | 'unanswered' | 'closed' | 'all';

function TicketCard({ ticket, onOpen }: { ticket: Ticket; onOpen: () => void }) {
    const urgent = ticket.priority === 'urgent' && ticket.status !== 'closed';
    const closed = ticket.status === 'closed';
    const agent = ticket.agent_name ?? 'Compte supprimé';

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className={cn(
                    'group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm shadow-slate-900/[0.03] transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:shadow-slate-900/[0.06] focus-visible:ring-4 focus-visible:ring-motriks/20 focus-visible:outline-none sm:p-5 dark:bg-card',
                    urgent ? 'border-red-200 hover:border-red-300 dark:border-red-500/30' : 'border-slate-200/80 hover:border-slate-300 dark:border-sidebar-border',
                    closed && 'bg-slate-50/50',
                )}
            >
                {urgent && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-red-500" />}

                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        closed ? 'bg-slate-100 text-slate-400 dark:bg-white/5' : 'bg-motriks-soft text-motriks-deep',
                    )}
                >
                    {initials(agent)}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className={cn('truncate text-sm font-semibold', closed ? 'text-slate-500' : 'text-ink')}>{ticket.subject}</p>
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
                            <StatusBadge tone={STATUS[ticket.status].tone}>{STATUS[ticket.status].label}</StatusBadge>
                        </div>
                    </div>

                    <p className={cn('mt-2.5 line-clamp-2 text-sm leading-relaxed', closed ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300')}>{ticket.body}</p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                        {ticket.response ? (
                            <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                                <MessageSquareReply className="size-3.5 shrink-0 text-motriks" />
                                <span className="truncate">
                                    <span className="font-medium text-slate-600 dark:text-slate-300">{ticket.responder ?? 'Réponse'} :</span> {ticket.response}
                                </span>
                            </p>
                        ) : (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                <AlertCircle className="size-3.5" />
                                Sans réponse
                            </p>
                        )}
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-motriks-deep opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100">
                            {closed ? 'Voir' : ticket.response ? 'Suivre' : 'Répondre'}
                            <ChevronRight className="size-3.5" />
                        </span>
                    </div>
                </div>
            </button>
        </li>
    );
}

export default function TicketsIndex({ tickets }: { tickets: Ticket[] }) {
    const [filter, setFilter] = useState<Filter>('pending');
    const [query, setQuery] = useState('');
    const [openId, setOpenId] = useState<number | null>(null);

    const pending = tickets.filter((t) => t.status !== 'closed');
    const unanswered = pending.filter((t) => t.response === null).length;
    const urgent = pending.filter((t) => t.priority === 'urgent').length;
    const closed = tickets.length - pending.length;

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return tickets.filter((t) => {
            const inFilter =
                filter === 'all' ||
                (filter === 'closed' && t.status === 'closed') ||
                (filter === 'pending' && t.status !== 'closed') ||
                (filter === 'unanswered' && t.status !== 'closed' && t.response === null);
            return inFilter && (!q || `${t.subject} ${t.body} ${t.agent_name ?? ''}`.toLowerCase().includes(q));
        });
    }, [tickets, filter, query]);

    // Le ticket ouvert est relu dans les props, pour refléter une mise à jour
    const opened = tickets.find((t) => t.id === openId) ?? null;

    return (
        <>
            <Head title="Tickets" />

            <Page title="Tickets" description="Les demandes de votre équipe terrain, et vos réponses." className="max-w-5xl">
                {tickets.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                        <QuietEmpty icon={MessageCircleQuestion} title="Aucune demande pour le moment">
                            Les demandes envoyées par vos hôtesses depuis leur espace terrain apparaîtront ici.
                        </QuietEmpty>
                    </div>
                ) : (
                    <>
                        <MetricRow
                            items={[
                                { label: 'À traiter', value: pending.length, hint: 'Ouvertes ou en cours', icon: Inbox, tone: pending.length ? 'blue' : 'default' },
                                { label: 'Sans réponse', value: unanswered, hint: 'À traiter en priorité', icon: AlertCircle, tone: unanswered ? 'amber' : 'default', pulse: true },
                                { label: 'Urgentes', value: urgent, hint: 'Parmi celles à traiter', icon: Siren, tone: urgent ? 'red' : 'default' },
                                { label: 'Résolues', value: closed, hint: 'Demandes fermées', icon: CheckCircle2, tone: 'green' },
                            ]}
                        />

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Segmented
                                label="Filtrer les demandes"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    { value: 'pending', label: 'À traiter', count: pending.length },
                                    { value: 'unanswered', label: 'Sans réponse', count: unanswered },
                                    { value: 'closed', label: 'Résolues', count: closed },
                                    { value: 'all', label: 'Toutes', count: tickets.length },
                                ]}
                            />
                            <div className="sm:w-72">
                                <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sujet, message ou hôtesse" aria-label="Rechercher une demande" className="h-9" />
                            </div>
                        </div>

                        {shown.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                                {query.trim() ? (
                                    <QuietEmpty icon={Search} title="Aucune demande ne correspond">
                                        Modifiez la recherche ou le filtre.
                                    </QuietEmpty>
                                ) : (
                                    <QuietEmpty icon={CheckCircle2} title={filter === 'closed' ? 'Aucune demande résolue' : 'Tout est traité'}>
                                        {filter === 'closed' ? 'Les demandes que vous résolvez apparaîtront ici.' : 'Aucune demande n’attend de réponse. Bravo à l’équipe !'}
                                    </QuietEmpty>
                                )}
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {shown.map((t) => (
                                    <TicketCard key={t.id} ticket={t} onOpen={() => setOpenId(t.id)} />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </Page>

            {opened && <TicketModal key={opened.id} ticket={opened} onClose={() => setOpenId(null)} />}
        </>
    );
}

TicketsIndex.layout = {
    breadcrumbs: [{ title: 'Tickets', href: ticketsIndex().url }],
};
