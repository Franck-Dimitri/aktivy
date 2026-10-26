import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    ChevronDown,
    MessageSquarePlus,
    Phone,
    Send,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { TextArea } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import {
    index as ticketsIndex,
    update as ticketUpdate,
} from '@/routes/tickets';

type TicketStatus = 'open' | 'in_review' | 'closed';

type Ticket = {
    id: number;
    subject: string;
    body: string;
    priority: 'normal' | 'urgent';
    status: TicketStatus;
    response: string | null;
    responder: string | null;
    responded_at: string | null;
    created_at: string;
    created_date: string;
    agent_name: string | null;
    agent_phone: string | null;
};

const statusTone: Record<TicketStatus, StatusTone> = {
    open: 'info',
    in_review: 'warning',
    closed: 'success',
};

const statusLabel: Record<TicketStatus, string> = {
    open: 'Ouvert',
    in_review: 'En cours',
    closed: 'Résolu',
};

type Filter = 'pending' | 'closed' | 'all';

const filters: { value: Filter; label: string }[] = [
    { value: 'pending', label: 'À traiter' },
    { value: 'closed', label: 'Résolues' },
    { value: 'all', label: 'Toutes' },
];

/* ─── Formulaire de réponse ─── */

function ReplyForm({ ticket }: { ticket: Ticket }) {
    const [response, setResponse] = useState(ticket.response ?? '');
    const [status, setStatus] = useState<TicketStatus>(ticket.status);
    const [busy, setBusy] = useState(false);

    function submit() {
        router.put(
            ticketUpdate({ ticket: ticket.id }).url,
            { response, status },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onSuccess: () => toast.success('Demande mise à jour'),
                onError: toastFormError,
                onFinish: () => setBusy(false),
            },
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <TextArea
                rows={3}
                placeholder="Votre réponse à l'hôtesse…"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                maxLength={2000}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                    className="flex flex-wrap gap-1.5"
                    role="radiogroup"
                    aria-label="Statut"
                >
                    {(Object.keys(statusLabel) as TicketStatus[]).map((s) => (
                        <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={status === s}
                            onClick={() => setStatus(s)}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors',
                                status === s
                                    ? 'bg-motriks-soft text-motriks-deep ring-green-300'
                                    : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50',
                            )}
                        >
                            {statusLabel[s]}
                        </button>
                    ))}
                </div>
                <ActionButton
                    size="sm"
                    icon={<Send />}
                    loading={busy}
                    onClick={submit}
                >
                    Enregistrer
                </ActionButton>
            </div>
        </div>
    );
}

/* ─── Carte ticket ─── */

function TicketCard({ ticket }: { ticket: Ticket }) {
    const [expanded, setExpanded] = useState(
        ticket.status !== 'closed' && ticket.response === null,
    );

    return (
        <li
            className={cn(
                'relative before:absolute before:inset-y-0 before:left-0 before:w-1',
                ticket.priority === 'urgent'
                    ? 'before:bg-red-500'
                    : 'before:bg-motriks',
            )}
        >
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="w-full px-5 py-4 pl-6 text-left transition-colors hover:bg-green-50/40 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none focus-visible:ring-inset"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink">
                                {ticket.subject}
                            </p>
                            {ticket.priority === 'urgent' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                                    <AlertCircle className="size-3" />
                                    Urgent
                                </span>
                            )}
                            {ticket.response && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-motriks-soft px-2 py-0.5 text-[11px] font-semibold text-motriks-deep ring-1 ring-green-200">
                                    <Check className="size-3" />
                                    Répondu
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                            {ticket.agent_name ?? 'Compte supprimé'} ·{' '}
                            {ticket.created_at}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge tone={statusTone[ticket.status]}>
                            {statusLabel[ticket.status]}
                        </StatusBadge>
                        <span
                            className={cn(
                                'flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all duration-200',
                                expanded &&
                                    'rotate-180 bg-motriks-soft text-motriks-deep',
                            )}
                        >
                            <ChevronDown className="size-3.5" />
                        </span>
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-5 pl-7">
                    <div className="flex flex-col items-start gap-1.5">
                        <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-400">
                            {ticket.agent_name ?? 'Compte supprimé'}
                            {ticket.agent_phone && (
                                <a
                                    href={`tel:${ticket.agent_phone}`}
                                    className="inline-flex items-center gap-1 text-motriks-deep hover:underline"
                                >
                                    <Phone className="size-3" />
                                    {ticket.agent_phone}
                                </a>
                            )}
                        </p>
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 shadow-sm">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
                                {ticket.body}
                            </p>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            {ticket.created_date}
                        </p>
                    </div>

                    {ticket.response && ticket.responded_at && (
                        <p className="text-[11px] text-slate-400">
                            Réponse de {ticket.responder ?? 'un responsable'} ·{' '}
                            {ticket.responded_at}
                        </p>
                    )}

                    <ReplyForm ticket={ticket} />
                </div>
            )}
        </li>
    );
}

/* ─── Page ─── */

export default function TicketsIndex({ tickets }: { tickets: Ticket[] }) {
    const [filter, setFilter] = useState<Filter>('pending');

    const pending = tickets.filter((t) => t.status !== 'closed');
    const urgent = pending.filter((t) => t.priority === 'urgent').length;
    const unanswered = pending.filter((t) => t.response === null).length;
    const closed = tickets.length - pending.length;

    const shown =
        filter === 'all'
            ? tickets
            : filter === 'closed'
              ? tickets.filter((t) => t.status === 'closed')
              : pending;

    return (
        <>
            <Head title="Tickets" />
            <GlowStyles />

            <Page
                title="Tickets"
                description="Les demandes de votre équipe terrain"
            >
                {tickets.length === 0 ? (
                    <GlowCard contentClassName="p-10">
                        <EmptyState
                            icon={MessageSquarePlus}
                            title="Aucune demande"
                            description="Les demandes envoyées par vos hôtesses depuis leur espace terrain apparaîtront ici."
                        />
                    </GlowCard>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                {
                                    label: 'À traiter',
                                    value: pending.length,
                                    sub: 'ouvertes ou en cours',
                                },
                                {
                                    label: 'Sans réponse',
                                    value: unanswered,
                                    sub: 'à traiter en priorité',
                                },
                                {
                                    label: 'Urgentes',
                                    value: urgent,
                                    sub: 'parmi celles à traiter',
                                },
                                {
                                    label: 'Résolues',
                                    value: closed,
                                    sub: 'demandes fermées',
                                },
                            ]}
                        />

                        <GlowCard contentClassName="p-0">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                                <h3 className="text-base font-semibold text-ink">
                                    Demandes
                                </h3>
                                <div className="flex gap-1.5">
                                    {filters.map((f) => (
                                        <button
                                            key={f.value}
                                            type="button"
                                            aria-pressed={filter === f.value}
                                            onClick={() => setFilter(f.value)}
                                            className={cn(
                                                'rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors',
                                                filter === f.value
                                                    ? 'bg-motriks text-white ring-motriks'
                                                    : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50',
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {shown.length === 0 ? (
                                <p className="px-6 py-8 text-center text-sm text-slate-500">
                                    Aucune demande dans cette liste.
                                </p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {shown.map((t) => (
                                        <TicketCard key={t.id} ticket={t} />
                                    ))}
                                </ul>
                            )}
                        </GlowCard>
                    </div>
                )}
            </Page>
        </>
    );
}

TicketsIndex.layout = {
    breadcrumbs: [{ title: 'Tickets', href: ticketsIndex().url }],
};
