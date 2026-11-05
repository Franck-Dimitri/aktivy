import { useForm, usePage } from '@inertiajs/react';
import { Bug, CreditCard, HelpCircle, Lightbulb, Send, type LucideIcon } from 'lucide-react';
import { useCallback, type FormEvent } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { Field, TextArea } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { support as supportRoute } from '@/routes/help';

export type SupportTopic = { value: string; label: string };

const ICONS: Record<string, LucideIcon> = { question: HelpCircle, bug: Bug, billing: CreditCard, idea: Lightbulb };

/** Page d'où vient l'utilisateur (même site uniquement), pour aider le support à reproduire. */
function originPage(): string {
    try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        return ref && ref.origin === window.location.origin ? ref.pathname + ref.search : window.location.pathname;
    } catch {
        return window.location.pathname;
    }
}

/** Demande au support depuis l'application. À monter uniquement quand il est ouvert. */
export function SupportModal({ topics, initialTopic, onClose }: { topics: SupportTopic[]; initialTopic?: string; onClose: () => void }) {
    const { auth } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        topic: initialTopic ?? topics[0]?.value ?? 'question',
        message: '',
        page: originPage(),
    });

    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(supportRoute().url, { preserveScroll: true, onSuccess: onClose, onError: toastFormError });
    };

    const placeholder: Record<string, string> = {
        question: 'Décrivez ce que vous cherchez à faire…',
        bug: 'Que s’est-il passé ? Sur quelle page ? Qu’attendiez-vous ?',
        billing: 'Quel module souhaitez-vous activer ou prolonger ?',
        idea: 'Qu’est-ce qui vous ferait gagner du temps ?',
    };

    return (
        <Modal onClose={close} title="Écrire au support" description="Nous vous répondons sous 24 h." icon={<Send />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
                    <fieldset>
                        <legend className="mb-2 text-sm font-semibold text-ink">Sujet</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {topics.map((t) => {
                                const Icon = ICONS[t.value] ?? HelpCircle;
                                const active = data.topic === t.value;
                                return (
                                    <label
                                        key={t.value}
                                        className={cn(
                                            'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left text-xs leading-snug font-medium transition-colors',
                                            active ? 'border-motriks/40 bg-motriks-soft/60 text-motriks-deep' : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-sidebar-border dark:text-slate-300',
                                        )}
                                    >
                                        <input type="radio" name="topic" value={t.value} checked={active} onChange={() => setData('topic', t.value)} className="sr-only" />
                                        <Icon className={cn('mt-px size-4 shrink-0', active ? 'text-motriks' : 'text-slate-400')} />
                                        {t.label}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <Field label="Message" htmlFor="support-message" required error={errors.message}>
                        <TextArea
                            id="support-message"
                            rows={5}
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            placeholder={placeholder[data.topic] ?? 'Votre message…'}
                            error={errors.message}
                            maxLength={4000}
                            required
                            autoFocus
                        />
                    </Field>

                    <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500 dark:bg-white/[0.03]">
                        Envoyé au nom de <span className="font-semibold text-ink">{auth.user.name}</span>
                        {auth.company?.name && <> · {auth.company.name}</>}
                        {auth.user.email ? <> · réponse à {auth.user.email}</> : <> · nous vous recontacterons par téléphone</>}. La page d’où vous venez est jointe pour nous aider.
                    </p>
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-sidebar-border dark:bg-card">
                    <ActionButton variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" icon={<Send />} loading={processing} disabled={data.message.trim().length < 10}>
                        Envoyer
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
