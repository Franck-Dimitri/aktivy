import { Link, router, useForm } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Building2, CheckCircle2, Globe, LifeBuoy, Mail, MailCheck, MailX, MessageSquare, Phone, RotateCcw, Send, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { type StatusTone } from '@/components/page/status-badge';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { toastFormError } from '@/lib/form-toast';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';
import { show as companyShow } from '@/routes/admin/companies';
import { reply as supportReply, status as supportStatus } from '@/routes/admin/support';

export type SupportStatus = 'new' | 'answered' | 'resolved';

export const SUPPORT_STATUS: Record<SupportStatus, { label: string; tone: StatusTone }> = {
    new: { label: 'Nouvelle', tone: 'warning' },
    answered: { label: 'Répondue', tone: 'info' },
    resolved: { label: 'Résolue', tone: 'success' },
};

/** Pastille d'état : même apparence dans la liste et la conversation. */
export const STATUS_PILL: Record<SupportStatus, { label: string; className: string; dot: string }> = {
    new: { label: 'Nouvelle', className: 'bg-amber-50 text-amber-700 ring-amber-600/15', dot: 'bg-amber-500' },
    answered: { label: 'Répondue', className: 'bg-sky-50 text-sky-700 ring-sky-600/15', dot: 'bg-sky-500' },
    resolved: { label: 'Résolue', className: 'bg-motriks-soft text-motriks-deep ring-green-600/15', dot: 'bg-motriks' },
};

export const SUPPORT_SOURCE: Record<string, { label: string; icon: typeof LifeBuoy }> = {
    help: { label: 'Centre d’aide', icon: LifeBuoy },
    contact: { label: 'Contact', icon: MessageSquare },
};

/** Demande complète, telle que l'envoie SupportController::detail(). */
export type SupportDetail = {
    id: number;
    uuid: string;
    source: string;
    source_label: string;
    topic: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    company_id: number | null;
    company_uuid: string | null;
    company: string | null;
    message: string;
    page: string | null;
    status: SupportStatus;
    at: string | null;
    ago: string | null;
    replies: { id: number; body: string; author: string | null; emailed: boolean; at: string | null; ago: string | null }[];
};

/** Aperçu affiché pendant le chargement de la demande (vient de la ligne cliquée). */
export type SupportPreview = { id: number; topic: string; name: string; status: SupportStatus; source: string };

const AVATAR_TONES = [
    'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    'bg-sky-50 text-sky-700 ring-sky-600/10',
    'bg-violet-50 text-violet-700 ring-violet-600/10',
    'bg-amber-50 text-amber-700 ring-amber-600/10',
    'bg-rose-50 text-rose-700 ring-rose-600/10',
    'bg-teal-50 text-teal-700 ring-teal-600/10',
];

/** Initiales d'une personne, teinte stable d'une visite à l'autre. */
export function PersonAvatar({ name, className }: { name: string; className?: string }) {
    const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

    return (
        <span
            aria-hidden
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tracking-tight ring-1 ring-inset',
                AVATAR_TONES[hash % AVATAR_TONES.length],
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}

export function StatusPill({ status, className }: { status: SupportStatus; className?: string }) {
    const pill = STATUS_PILL[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1',
                pill.className,
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', pill.dot)} />
            {pill.label}
        </span>
    );
}

type ConversationProps = {
    /** Demande chargée (null tant qu'elle arrive) ; `preview` sert d'en-tête en attendant. */
    detail: SupportDetail | null;
    preview: SupportPreview | null;
    /** Dans un Dialog Radix (téléphone) : titre et description reliés à la fenêtre. */
    inDialog?: boolean;
    onClose?: () => void;
};

/**
 * Traitement d'une demande : sujet et statut, coordonnées, fil de la conversation, réponse par e-mail.
 * Affiché dans le panneau de lecture (ordinateur) ou dans une fenêtre (téléphone).
 */
export function SupportConversation({ detail, preview, inDialog = false, onClose }: ConversationProps) {
    const head = detail ?? preview;
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({ body: '' });
    const [closing, setClosing] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);
    const thread = useRef<HTMLDivElement>(null);

    // Nouvelle demande ouverte : brouillon vidé
    const id = head?.id;
    useEffect(() => {
        reset('body');
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Fil déroulé jusqu'au dernier message à l'ouverture et après chaque réponse
    const replies = detail?.replies.length ?? 0;
    useEffect(() => {
        thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
    }, [detail?.id, replies]);

    const submit = (resolve: boolean) => {
        if (!detail || !data.body.trim()) {
            return;
        }

        setClosing(resolve);
        transform((d) => ({ ...d, resolve }));
        post(supportReply(detail.uuid).url, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => reset('body'),
            onError: toastFormError,
        });
    };

    const setStatus = (status: SupportStatus) => {
        if (!detail) {
            return;
        }

        router.put(
            supportStatus(detail.uuid).url,
            { status },
            { preserveScroll: true, preserveState: true, onStart: () => setStatusBusy(true), onFinish: () => setStatusBusy(false) },
        );
    };

    const source = head ? (SUPPORT_SOURCE[head.source] ?? SUPPORT_SOURCE.contact) : null;
    const firstName = head?.name.split(' ')[0] ?? '';
    const Title = inDialog ? DialogPrimitive.Title : 'h2';
    const Description = inDialog ? DialogPrimitive.Description : 'p';

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            {/* En-tête : sujet, statut, actions */}
            <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <Title className="text-base font-semibold tracking-tight text-ink">{head?.topic ?? 'Demande'}</Title>
                        {head && <StatusPill status={head.status} />}
                    </div>
                    <Description className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500">
                        <span className="font-medium text-slate-700">{head?.name}</span>
                        {source && (
                            <>
                                <span aria-hidden>·</span>
                                <span className="inline-flex items-center gap-1">
                                    <source.icon className="size-3.5" />
                                    {source.label}
                                </span>
                            </>
                        )}
                        {detail?.ago && (
                            <>
                                <span aria-hidden>·</span>
                                <time title={detail.at ?? undefined}>{detail.ago}</time>
                            </>
                        )}
                    </Description>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {detail &&
                        (detail.status === 'resolved' ? (
                            <ActionButton
                                size="sm"
                                variant="secondary"
                                icon={<RotateCcw />}
                                loading={statusBusy}
                                onClick={() => setStatus('answered')}
                            >
                                Rouvrir
                            </ActionButton>
                        ) : (
                            <ActionButton
                                size="sm"
                                variant="secondary"
                                icon={<CheckCircle2 />}
                                loading={statusBusy}
                                onClick={() => setStatus('resolved')}
                            >
                                <span className="hidden sm:inline">Marquer résolue</span>
                                <span className="sm:hidden">Résolue</span>
                            </ActionButton>
                        ))}
                    {inDialog ? (
                        <DialogPrimitive.Close
                            aria-label="Fermer"
                            className="-mr-2 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                        >
                            <X className="size-5" />
                        </DialogPrimitive.Close>
                    ) : (
                        onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fermer la conversation"
                                className="-mr-2 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="size-4" />
                            </button>
                        )
                    )}
                </div>
            </header>

            {/* Coordonnées */}
            {detail && (
                <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
                    {detail.email && (
                        <ContactChip icon={Mail} href={`mailto:${detail.email}`}>
                            {detail.email}
                        </ContactChip>
                    )}
                    {detail.phone && (
                        <ContactChip icon={Phone} href={`tel:${detail.phone}`}>
                            {detail.phone}
                        </ContactChip>
                    )}
                    {detail.company &&
                        (detail.company_uuid ? (
                            <Link
                                href={companyShow(detail.company_uuid).url}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80 transition-colors hover:text-motriks-deep hover:ring-green-300"
                            >
                                <Building2 className="size-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">{detail.company}</span>
                            </Link>
                        ) : (
                            <ContactChip icon={Building2}>{detail.company}</ContactChip>
                        ))}
                    {detail.role && <ContactChip icon={UserRound}>{detail.role}</ContactChip>}
                    {detail.page && (
                        <ContactChip icon={Globe} title={detail.page}>
                            {detail.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
                        </ContactChip>
                    )}
                </div>
            )}

            {/* Fil de la conversation */}
            <div ref={thread} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/40 px-5 py-6 sm:px-6">
                {detail ? (
                    <ol className="flex flex-col gap-6">
                        <Message
                            name={detail.name}
                            meta={detail.ago}
                            title={detail.at}
                            body={detail.message}
                            avatar={<PersonAvatar name={detail.name} className="size-9 text-xs" />}
                        />
                        {detail.replies.map((r) => (
                            <Message
                                key={r.id}
                                support
                                name={r.author ?? 'Support Motriks'}
                                meta={r.ago}
                                title={r.at}
                                body={r.body}
                                avatar={
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-motriks text-xs font-bold text-white">
                                        {initials(r.author ?? 'Support', 'S')}
                                    </span>
                                }
                                note={
                                    r.emailed ? (
                                        <span className="inline-flex items-center gap-1 text-motriks-deep">
                                            <MailCheck className="size-3.5" />
                                            Envoyée par e-mail
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-400">
                                            <MailX className="size-3.5" />
                                            Non envoyée par e-mail
                                        </span>
                                    )
                                }
                            />
                        ))}
                    </ol>
                ) : (
                    <ThreadSkeleton />
                )}
            </div>

            {/* Réponse */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(false);
                }}
                className="border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
            >
                <label htmlFor="support-reply" className="sr-only">
                    Votre réponse
                </label>
                <div
                    className={cn(
                        'rounded-2xl border bg-white shadow-xs transition-shadow focus-within:border-green-400 focus-within:ring-4 focus-within:ring-green-500/10',
                        errors.body ? 'border-red-300' : 'border-slate-200',
                    )}
                >
                    <textarea
                        id="support-reply"
                        rows={3}
                        value={data.body}
                        disabled={!detail}
                        onChange={(e) => setData('body', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                submit(false);
                            }
                        }}
                        placeholder={firstName ? `Répondre à ${firstName}…` : 'Votre réponse'}
                        className="block max-h-56 min-h-[5.5rem] w-full resize-none rounded-2xl bg-transparent px-4 pt-3 text-sm leading-relaxed text-ink outline-none placeholder:text-slate-400"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-1 pb-3">
                        <p className="min-w-0 truncate pl-1 text-xs text-slate-400">
                            {detail?.email ? (
                                <>
                                    À <span className="font-medium text-slate-600">{detail.email}</span>
                                    <span className="hidden sm:inline"> · Ctrl + Entrée pour envoyer</span>
                                </>
                            ) : detail ? (
                                'Pas d’e-mail : réponse seulement enregistrée'
                            ) : null}
                        </p>
                        <div className="ml-auto flex gap-2">
                            <ActionButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                loading={processing && closing}
                                disabled={!detail || !data.body.trim() || processing}
                                onClick={() => submit(true)}
                            >
                                Répondre et clore
                            </ActionButton>
                            <ActionButton
                                type="submit"
                                size="sm"
                                icon={<Send />}
                                loading={processing && !closing}
                                disabled={!detail || !data.body.trim() || processing}
                            >
                                Envoyer
                            </ActionButton>
                        </div>
                    </div>
                </div>
                {errors.body && <p className="mt-1.5 text-xs text-red-600">{errors.body}</p>}
            </form>
        </div>
    );
}

type ModalProps = {
    detail: SupportDetail | null;
    preview: SupportPreview | null;
    open: boolean;
    onClose: () => void;
};

/**
 * La conversation dans une fenêtre plein écran (téléphone et tablette). Radix Dialog : focus piégé,
 * Échap, focus rendu à la ligne cliquée.
 */
export function SupportRequestModal({ detail, preview, open, onClose }: ModalProps) {
    const opener = useRef<HTMLElement | null>(null);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogPortal>
                <DialogOverlay className="duration-200" />
                <DialogPrimitive.Content
                    aria-modal="true"
                    onOpenAutoFocus={(event) => {
                        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                        event.preventDefault();
                        (event.currentTarget as HTMLElement | null)?.focus();
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        opener.current?.focus();
                    }}
                    className={cn(
                        'fixed inset-0 z-50 flex flex-col overflow-hidden bg-white outline-none',
                        'duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                        'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(88vh,860px)] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
                        'sm:shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] sm:ring-1 sm:ring-slate-900/5',
                    )}
                >
                    <SupportConversation detail={detail} preview={preview} inDialog />
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}

function ContactChip({ icon: Icon, href, title, children }: { icon: typeof Mail; href?: string; title?: string; children: ReactNode }) {
    const className =
        'inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80';
    const content = (
        <>
            <Icon className="size-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{children}</span>
        </>
    );

    return href ? (
        <a href={href} title={title} className={cn(className, 'transition-colors hover:text-motriks-deep hover:ring-green-300')}>
            {content}
        </a>
    ) : (
        <span title={title} className={className}>
            {content}
        </span>
    );
}

/** Un message du fil : la demande (blanc) ou une réponse du support (teinte verte). */
function Message({
    name,
    meta,
    title,
    body,
    avatar,
    note,
    support = false,
}: {
    name: string;
    meta: string | null;
    title: string | null;
    body: string;
    avatar: ReactNode;
    note?: ReactNode;
    support?: boolean;
}) {
    return (
        <li className="flex gap-3">
            {avatar}
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-semibold text-ink">{name}</span>
                    {support && <span className="rounded-md bg-green-50 px-1.5 py-px text-[10px] font-semibold text-motriks-deep">Support</span>}
                    {meta && (
                        <time title={title ?? undefined} className="text-xs text-slate-400">
                            {meta}
                        </time>
                    )}
                </p>
                <div
                    className={cn(
                        'mt-1.5 rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-line',
                        support ? 'bg-green-50 text-ink ring-1 ring-green-600/10' : 'bg-white text-ink shadow-xs ring-1 ring-slate-900/5',
                    )}
                >
                    {body}
                </div>
                {note && <p className="mt-1.5 text-[11px]">{note}</p>}
            </div>
        </li>
    );
}

function ThreadSkeleton() {
    return (
        <div role="status" aria-label="Chargement de la demande" className="flex animate-pulse flex-col gap-6">
            {[0, 1].map((i) => (
                <div key={i} className="flex gap-3">
                    <div className="size-9 shrink-0 rounded-full bg-slate-100" />
                    <div className="flex-1">
                        <div className="h-3 w-32 rounded bg-slate-100" />
                        <div className="mt-2.5 h-20 rounded-2xl bg-white" />
                    </div>
                </div>
            ))}
        </div>
    );
}
