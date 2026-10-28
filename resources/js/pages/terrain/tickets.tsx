import { Head, router } from '@inertiajs/react';
import { Check, ChevronRight, Clock, MessageSquare, MessageSquarePlus, Send, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { TextArea, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { cancel as ticketCancel, index as terrainTickets, store as ticketStore } from '@/routes/terrain/tickets';

/* ─────────────────────── Types ─────────────────────── */

type Ticket = {
    id: number;
    subject: string;
    body: string;
    priority: 'normal' | 'urgent';
    status: 'open' | 'in_review' | 'closed';
    response: string | null;
    responded_at: string | null;
    created_at: string;
    created_date: string;
    can_cancel: boolean;
};

type Filter = 'all' | 'open' | 'closed';

const statusTone: Record<Ticket['status'], StatusTone> = {
    open: 'info',
    in_review: 'warning',
    closed: 'success',
};

const statusLabel: Record<Ticket['status'], string> = {
    open: 'Ouvert',
    in_review: 'En cours',
    closed: 'Résolu',
};

/* ─────────────────────── Petits éléments ─────────────────────── */

function UrgentBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200/70">
            <Zap className="size-3" />
            Urgent
        </span>
    );
}

function AnsweredBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-aktivy-soft px-2 py-0.5 text-[11px] font-semibold text-aktivy-deep ring-1 ring-green-200/70">
            <Check className="size-3" />
            Répondu
        </span>
    );
}

/* ─────────────────────── Modal : nouvelle demande ─────────────────────── */

const priorityOptions = [
    { value: 'normal', label: 'Normal', hint: 'Délai standard', icon: Clock },
    { value: 'urgent', label: 'Urgent', hint: 'Traitement prioritaire', icon: Zap },
] as const;

function NewTicketModal({ onClose }: { onClose: () => void }) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [busy, setBusy] = useState(false);

    const canSend = subject.trim().length > 0 && body.trim().length > 0;

    function submit() {
        if (!canSend) {
            toast.error('Remplissez le sujet et la description.');
            return;
        }

        router.post(
            ticketStore().url,
            { subject, body, priority },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onSuccess: () => {
                    toast.success('Demande envoyée', { description: 'Votre responsable va la traiter prochainement.' });
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setBusy(false),
            },
        );
    }

    return (
        <Modal
            onClose={onClose}
            title="Nouvelle demande"
            description="Votre responsable vous répondra rapidement."
            icon={<MessageSquarePlus />}
        >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                {/* Priorité */}
                <div role="radiogroup" aria-label="Priorité" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1">
                    {priorityOptions.map(({ value, label, hint, icon: Icon }) => {
                        const active = priority === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setPriority(value)}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                    active ? 'bg-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                                        active
                                            ? value === 'urgent'
                                                ? 'bg-red-50 text-red-600'
                                                : 'bg-green-50 text-aktivy-deep'
                                            : 'bg-transparent text-slate-400',
                                    )}
                                >
                                    <Icon className="size-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className={cn('block text-sm font-semibold', active ? 'text-ink' : '')}>{label}</span>
                                    <span className="block truncate text-xs text-slate-400">{hint}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sujet */}
                <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                        <label className="text-sm font-medium text-ink">Sujet</label>
                        <span className="text-xs text-slate-400 tabular-nums">{subject.length}/200</span>
                    </div>
                    <TextInput
                        placeholder="Ex : rupture de stock, problème de matériel…"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        maxLength={200}
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                        <label className="text-sm font-medium text-ink">Description</label>
                        <span className="text-xs text-slate-400 tabular-nums">{body.length}/2000</span>
                    </div>
                    <TextArea
                        rows={5}
                        placeholder="Donnez un maximum de détails pour accélérer la réponse."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={2000}
                    />
                </div>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-10 rounded-xl px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                >
                    Annuler
                </button>
                <ActionButton onClick={submit} loading={busy} icon={<Send />} disabled={!canSend} className="h-10 rounded-xl">
                    {busy ? 'Envoi…' : 'Envoyer'}
                </ActionButton>
            </footer>
        </Modal>
    );
}

/* ─────────────────────── Modal : conversation ─────────────────────── */

function TicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    function cancelTicket() {
        router.delete(ticketCancel({ ticket: ticket.id }).url, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onSuccess: () => {
                toast.success('Demande retirée', { description: 'Votre responsable ne la verra plus.' });
                onClose();
            },
            onError: toastFormError,
            onFinish: () => setBusy(false),
        });
    }

    return (
        <Modal onClose={onClose} title={ticket.subject} description={`Envoyée ${ticket.created_at} · ${ticket.created_date}`} icon={<MessageSquare />}>
            <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone[ticket.status]}>{statusLabel[ticket.status]}</StatusBadge>
                    {ticket.priority === 'urgent' && <UrgentBadge />}
                </div>

                <div className="mt-5 flex flex-col gap-5">
                    {/* Ma demande */}
                    <div className="flex flex-col items-end gap-1.5">
                        <p className="text-xs font-medium text-slate-400">Vous</p>
                        <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-ink px-4 py-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{ticket.body}</p>
                        </div>
                    </div>

                    {/* Réponse */}
                    {ticket.response ? (
                        <div className="flex flex-col items-start gap-1.5">
                            <p className="text-xs font-medium text-aktivy-deep">Votre responsable</p>
                            <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-green-200/70 bg-aktivy-soft px-4 py-3">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-green-950">{ticket.response}</p>
                            </div>
                            {ticket.responded_at && <p className="text-xs text-slate-400">{ticket.responded_at}</p>}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                <Clock className="size-4" />
                            </span>
                            <div>
                                <p className="text-sm font-medium text-ink">En attente de réponse</p>
                                <p className="text-xs text-slate-500">Votre responsable vous répondra prochainement.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Retrait possible uniquement tant que la demande est ouverte et sans réponse */}
            {ticket.can_cancel && (
                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
                    {confirming ? (
                        <>
                            <p className="text-sm text-slate-600">Retirer cette demande ?</p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirming(false)}
                                    disabled={busy}
                                    className="h-9 rounded-xl px-3.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-50"
                                >
                                    Garder
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelTicket}
                                    disabled={busy}
                                    className="h-9 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                                >
                                    {busy ? 'Retrait…' : 'Retirer'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirming(true)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        >
                            <Trash2 className="size-4" />
                            Retirer la demande
                        </button>
                    )}
                </footer>
            )}
        </Modal>
    );
}

/* ─────────────────────── Ligne de la liste ─────────────────────── */

function TicketRow({ ticket, onOpen }: { ticket: Ticket; onOpen: () => void }) {
    const closed = ticket.status === 'closed';

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-green-50/40 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none focus-visible:ring-inset sm:px-6"
            >
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                        closed
                            ? 'bg-slate-50 text-slate-400 ring-slate-200'
                            : ticket.priority === 'urgent'
                              ? 'bg-red-50 text-red-600 ring-red-200/70'
                              : 'bg-green-50 text-aktivy-deep ring-green-600/15',
                    )}
                >
                    {closed ? <Check className="size-4.5" /> : ticket.priority === 'urgent' ? <Zap className="size-4.5" /> : <MessageSquare className="size-4.5" />}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm font-semibold text-ink">{ticket.subject}</p>
                        {ticket.priority === 'urgent' && !closed && <UrgentBadge />}
                        {ticket.response && <AnsweredBadge />}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{ticket.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{ticket.created_at}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden sm:block">
                        <StatusBadge tone={statusTone[ticket.status]}>{statusLabel[ticket.status]}</StatusBadge>
                    </span>
                    <ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-aktivy" />
                </div>
            </button>
        </li>
    );
}

/* ─────────────────────── Page ─────────────────────── */

export default function TerrainTickets({ tickets }: { tickets: Ticket[] }) {
    const [creating, setCreating] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [filter, setFilter] = useState<Filter>('all');

    const openCount = tickets.filter((t) => t.status !== 'closed').length;
    const closedCount = tickets.length - openCount;

    const filters: { key: Filter; label: string; count: number }[] = [
        { key: 'all', label: 'Toutes', count: tickets.length },
        { key: 'open', label: 'En cours', count: openCount },
        { key: 'closed', label: 'Résolues', count: closedCount },
    ];

    const visible = tickets.filter((t) => (filter === 'all' ? true : filter === 'open' ? t.status !== 'closed' : t.status === 'closed'));
    const selected = tickets.find((t) => t.id === selectedId) ?? null;

    return (
        <>
            <Head title="Tickets" />

            <Page
                title="Tickets"
                description="Soumettez vos demandes et suivez leur avancement"
                actions={
                    tickets.length > 0 ? (
                        <ActionButton icon={<MessageSquarePlus />} onClick={() => setCreating(true)}>
                            Nouvelle demande
                        </ActionButton>
                    ) : undefined
                }
            >
                {tickets.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-10 sm:p-16">
                        <EmptyState
                            icon={MessageSquarePlus}
                            title="Aucune demande"
                            description="Signalez un besoin ou posez une question à votre responsable."
                            action={
                                <ActionButton icon={<MessageSquarePlus />} onClick={() => setCreating(true)}>
                                    Créer ma première demande
                                </ActionButton>
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {/* Filtres */}
                        <div role="tablist" aria-label="Filtrer les demandes" className="inline-flex w-fit gap-1 rounded-2xl bg-slate-100/80 p-1">
                            {filters.map((f) => {
                                const active = filter === f.key;
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setFilter(f.key)}
                                        className={cn(
                                            'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                            active ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                                        )}
                                    >
                                        {f.label}
                                        <span
                                            className={cn(
                                                'rounded-full px-1.5 text-xs font-semibold tabular-nums',
                                                active ? 'bg-aktivy-soft text-aktivy-deep' : 'text-slate-400',
                                            )}
                                        >
                                            {f.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Liste */}
                        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
                            {visible.length > 0 ? (
                                <ul className="divide-y divide-slate-100">
                                    {visible.map((t) => (
                                        <TicketRow key={t.id} ticket={t} onOpen={() => setSelectedId(t.id)} />
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-12">
                                    <EmptyState
                                        icon={MessageSquare}
                                        title="Rien ici pour le moment"
                                        description="Aucune demande ne correspond à ce filtre."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Page>

            {creating && <NewTicketModal onClose={() => setCreating(false)} />}
            {selected && <TicketModal ticket={selected} onClose={() => setSelectedId(null)} />}
        </>
    );
}

TerrainTickets.layout = {
    breadcrumbs: [{ title: 'Tickets', href: terrainTickets().url }],
};