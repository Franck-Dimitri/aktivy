import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    ChevronDown,
    Clock,
    MessageSquarePlus,
    Send,
    X,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { TextArea, TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { index as terrainTickets, store as ticketStore } from '@/routes/terrain/tickets';

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
};

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

/* ─── Formulaire nouveau ticket ─── */

function NewTicketForm({ onClose }: { onClose: () => void }) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [busy, setBusy] = useState(false);

    function submit() {
        if (!subject.trim() || !body.trim()) {
            toast.error('Remplissez tous les champs obligatoires.');
            return;
        }
        router.post(ticketStore().url, { subject, body, priority }, {
            onStart: () => setBusy(true),
            onSuccess: () => {
                toast.success('Demande envoyée', { description: 'Votre responsable va la traiter prochainement.' });
                onClose();
            },
            onError: toastFormError,
            onFinish: () => setBusy(false),
        });
    }

    return (
        <GlowCard contentClassName="p-0">
            {/* En-tête formulaire */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                    <h3 className="text-base font-semibold text-ink">Nouvelle demande</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Votre responsable vous répondra rapidement.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
                    aria-label="Fermer"
                >
                    <X className="size-4" />
                </button>
            </div>

            <div className="flex flex-col gap-5 p-6">
                {/* Priorité — sélection visuelle en haut */}
                <div>
                    <p className="mb-2 text-sm font-medium text-ink">Priorité</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(['normal', 'urgent'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                className={cn(
                                    'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all',
                                    priority === p
                                        ? p === 'urgent'
                                            ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm'
                                            : 'border-green-300 bg-motriks-soft text-motriks-deep ring-1 ring-green-200 shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                                )}
                            >
                                <span className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors',
                                    priority === p
                                        ? p === 'urgent'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-motriks-deep'
                                        : 'bg-slate-100 text-slate-400',
                                )}>
                                    {p === 'urgent' ? <Zap className="size-4" /> : <Clock className="size-4" />}
                                </span>
                                <div>
                                    <p className="font-semibold">
                                        {p === 'urgent' ? 'Urgent' : 'Normal'}
                                    </p>
                                    <p className="text-xs opacity-70">
                                        {p === 'urgent' ? 'Traitement prioritaire' : 'Délai standard'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sujet */}
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                        Sujet <span className="text-red-500">*</span>
                    </label>
                    <TextInput
                        placeholder="Ex: Rupture de stock produit X, problème de matériel…"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        maxLength={200}
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">{subject.length}/200</p>
                </div>

                {/* Description */}
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <TextArea
                        rows={4}
                        placeholder="Décrivez votre demande avec le maximum de détails pour accélérer la résolution…"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={2000}
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">{body.length}/2000</p>
                </div>

                <ActionButton
                    onClick={submit}
                    loading={busy}
                    icon={<Send />}
                    disabled={!subject.trim() || !body.trim()}
                    className="h-12 w-full rounded-2xl text-base"
                >
                    {busy ? 'Envoi en cours…' : 'Envoyer la demande'}
                </ActionButton>
            </div>
        </GlowCard>
    );
}

/* ─── Carte ticket ─── */

function TicketCard({ ticket }: { ticket: Ticket }) {
    const [expanded, setExpanded] = useState(false);

    const priorityLeft = ticket.priority === 'urgent' ? 'before:bg-red-500' : 'before:bg-motriks';

    return (
        <li className={cn(
            'relative before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-2xl',
            priorityLeft,
        )}>
            {/* Row — en-tête cliquable */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full px-5 py-4 pl-6 text-left transition-colors hover:bg-green-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-inset"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink">{ticket.subject}</p>
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
                        <p className="mt-0.5 text-xs text-slate-400">{ticket.created_at}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge tone={statusTone[ticket.status]}>
                            {statusLabel[ticket.status]}
                        </StatusBadge>
                        <span className={cn(
                            'flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all duration-200',
                            expanded && 'bg-motriks-soft rotate-180 text-motriks-deep',
                        )}>
                            <ChevronDown className="size-3.5" />
                        </span>
                    </div>
                </div>
            </button>

            {/* Corps — conversation */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-5 pl-7">
                    <div className="flex flex-col gap-4">

                        {/* Ma demande — droite */}
                        <div className="flex flex-col items-end gap-1.5">
                            <p className="text-[11px] font-semibold text-slate-400">Ma demande</p>
                            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-slate-800 px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                                    {ticket.body}
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-400">{ticket.created_at}</p>
                        </div>

                        {/* Réponse — gauche */}
                        {ticket.response ? (
                            <div className="flex flex-col items-start gap-1.5">
                                <p className="text-[11px] font-semibold text-motriks-deep">Votre responsable</p>
                                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-green-100 bg-motriks-soft px-4 py-3 shadow-sm">
                                    <p className="text-sm leading-relaxed text-green-900 whitespace-pre-wrap">
                                        {ticket.response}
                                    </p>
                                </div>
                                {ticket.responded_at && (
                                    <p className="text-[11px] text-slate-400">{ticket.responded_at}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 px-4 py-3.5 ring-1 ring-amber-200/60">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                                    <Clock className="size-3.5 text-amber-700" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-amber-800">En attente de réponse</p>
                                    <p className="text-xs text-amber-700">
                                        Votre responsable prendra contact prochainement.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

/* ─── Page ─── */

export default function TerrainTickets({ tickets }: { tickets: Ticket[] }) {
    const [showForm, setShowForm] = useState(false);

    const open = tickets.filter((t) => t.status !== 'closed').length;
    const closed = tickets.filter((t) => t.status === 'closed').length;
    const urgent = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed').length;
    const answered = tickets.filter((t) => t.response !== null).length;

    return (
        <>
            <Head title="Tickets" />
            <GlowStyles />

            <Page
                title="Tickets"
                description="Soumettez vos demandes et suivez leur avancement"
                actions={
                    !showForm ? (
                        <ActionButton icon={<MessageSquarePlus />} onClick={() => setShowForm(true)}>
                            Nouvelle demande
                        </ActionButton>
                    ) : undefined
                }
            >
                <div className="flex flex-col gap-6">
                    {showForm && (
                        <NewTicketForm onClose={() => setShowForm(false)} />
                    )}

                    {tickets.length === 0 && !showForm ? (
                        <GlowCard contentClassName="p-10">
                            <EmptyState
                                icon={MessageSquarePlus}
                                title="Aucune demande"
                                description="Utilisez ce module pour signaler un besoin ou poser une question à votre responsable."
                                action={
                                    <ActionButton icon={<MessageSquarePlus />} onClick={() => setShowForm(true)}>
                                        Créer ma première demande
                                    </ActionButton>
                                }
                            />
                        </GlowCard>
                    ) : tickets.length > 0 ? (
                        <>
                            <MetricStrip
                                items={[
                                    { label: 'En attente', value: open, sub: 'demandes ouvertes' },
                                    { label: 'Répondus', value: answered, sub: 'avec une réponse' },
                                    { label: 'Urgents', value: urgent, sub: 'en traitement prioritaire' },
                                    { label: 'Résolus', value: closed, sub: 'demandes fermées' },
                                ]}
                            />

                            <GlowCard contentClassName="p-0">
                                <div className="border-b border-slate-100 px-6 py-4">
                                    <h3 className="text-base font-semibold text-ink">Mes demandes</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Cliquez sur une demande pour voir la conversation.
                                    </p>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {tickets.map((t) => (
                                        <TicketCard key={t.id} ticket={t} />
                                    ))}
                                </ul>
                            </GlowCard>
                        </>
                    ) : null}
                </div>
            </Page>
        </>
    );
}

TerrainTickets.layout = {
    breadcrumbs: [{ title: 'Tickets', href: terrainTickets().url }],
};
