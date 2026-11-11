import { router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, MessageSquareReply, Phone, RotateCcw, Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { StatusBadge } from '@/components/page/status-badge';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { update as ticketUpdate } from '@/routes/tickets';
import { initials, STATUS, type Ticket, type TicketStatus } from './ticket-types';

const QUICK_REPLIES = [
    'Bien reçu, je m’en occupe.',
    'Le réassort arrive dans la journée.',
    'Je vous appelle dans quelques minutes.',
    'C’est réglé, merci pour le signalement.',
];

/** Conversation d'un ticket et réponse du responsable. À monter uniquement quand il est ouvert. */
export function TicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
    const [response, setResponse] = useState(ticket.response ?? '');
    const [busy, setBusy] = useState(false);

    const closed = ticket.status === 'closed';
    const changed = response.trim() !== (ticket.response ?? '').trim();
    const agent = ticket.agent_name ?? 'Compte supprimé';

    const close = useCallback(() => {
        if (!busy) onClose();
    }, [busy, onClose]);

    const save = (status: TicketStatus, message: string) => {
        router.put(
            ticketUpdate({ ticket: ticket.uuid }).url,
            { response, status },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onSuccess: () => {
                    toast.success(message);
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setBusy(false),
            },
        );
    };

    // Répondre fait passer une demande ouverte « en cours » ; une demande résolue le reste
    const replyStatus: TicketStatus = closed ? 'closed' : 'in_review';

    return (
        <Modal onClose={close} title={ticket.subject} description={`Demande n° ${ticket.id} · ${ticket.created_date}`} size="lg" icon={<MessageSquareReply />}>
            <div className="flex min-h-0 flex-1 flex-col">
                {/* Bandeau : statut, priorité, contact */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 pb-4 dark:border-sidebar-border">
                    <StatusBadge tone={STATUS[ticket.status].tone}>{STATUS[ticket.status].label}</StatusBadge>
                    {ticket.priority === 'urgent' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-600/15 ring-inset">
                            <AlertCircle className="size-3" />
                            Urgent
                        </span>
                    )}
                    {ticket.agent_phone && (
                        <a href={`tel:${ticket.agent_phone}`} className={buttonClass('secondary', 'sm', 'ml-auto')}>
                            <Phone />
                            Appeler {agent.split(' ')[0]}
                        </a>
                    )}
                </div>

                {/* Fil de la conversation */}
                <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-6 py-5 dark:bg-white/[0.02]">
                    <div className="flex items-end gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{initials(agent)}</span>
                        <div className="max-w-[85%]">
                            <p className="mb-1 text-[11px] font-medium text-slate-500">
                                {agent} · {ticket.created_at}
                            </p>
                            <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink shadow-sm ring-1 ring-slate-200/70 dark:bg-card dark:ring-sidebar-border">{ticket.body}</div>
                        </div>
                    </div>

                    {ticket.response && (
                        <div className="flex flex-row-reverse items-end gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-motriks text-[11px] font-bold text-white">{initials(ticket.responder ?? 'Vous')}</span>
                            <div className="flex max-w-[85%] flex-col items-end">
                                <p className="mb-1 text-[11px] font-medium text-slate-500">
                                    {ticket.responder ?? 'Un responsable'}
                                    {ticket.responded_at && ` · ${ticket.responded_at}`}
                                </p>
                                <div className="rounded-2xl rounded-br-md bg-motriks px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-sm shadow-green-900/10">{ticket.response}</div>
                            </div>
                        </div>
                    )}

                    {closed && (
                        <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400">
                            <CheckCircle2 className="size-3.5 text-motriks" />
                            Demande résolue
                        </p>
                    )}
                </div>

                {/* Réponse */}
                <div className="border-t border-slate-100 bg-white px-6 pt-4 pb-5 dark:border-sidebar-border dark:bg-card">
                    <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                        {QUICK_REPLIES.map((q) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => setResponse(q)}
                                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-ink hover:ring-slate-300 dark:text-slate-300 dark:ring-sidebar-border dark:hover:bg-white/5"
                            >
                                {q}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 transition-[border-color,box-shadow] focus-within:border-motriks focus-within:ring-4 focus-within:ring-motriks/10 dark:border-sidebar-border">
                        <textarea
                            rows={3}
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && changed && response.trim()) {
                                    e.preventDefault();
                                    save(replyStatus, 'Réponse envoyée');
                                }
                            }}
                            maxLength={2000}
                            placeholder={ticket.response ? 'Modifier votre réponse…' : `Répondre à ${agent.split(' ')[0]}…`}
                            aria-label="Votre réponse"
                            autoFocus
                            className="block w-full resize-none rounded-2xl bg-transparent px-4 pt-3 text-sm text-ink outline-none placeholder:text-slate-400"
                        />
                        <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                            <span className="hidden text-[11px] text-slate-400 sm:inline">Ctrl + Entrée pour envoyer · {response.length}/2000</span>
                            <div className="ml-auto flex items-center gap-2">
                                {closed ? (
                                    <ActionButton variant="ghost" size="sm" icon={<RotateCcw />} loading={busy} onClick={() => save('in_review', 'Demande rouverte')}>
                                        Rouvrir
                                    </ActionButton>
                                ) : (
                                    <ActionButton variant="secondary" size="sm" icon={<CheckCircle2 />} loading={busy} onClick={() => save('closed', changed && response.trim() ? 'Réponse envoyée, demande résolue' : 'Demande résolue')}>
                                        {changed && response.trim() ? 'Envoyer et résoudre' : 'Marquer résolue'}
                                    </ActionButton>
                                )}
                                <ActionButton size="sm" icon={<Send />} loading={busy} disabled={!changed || !response.trim()} onClick={() => save(replyStatus, 'Réponse envoyée')}>
                                    {ticket.response ? 'Mettre à jour' : 'Envoyer'}
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
