import { router, useForm } from '@inertiajs/react';
import { KeyRound, Phone, Store, Trash2, UserCheck, UserPlus, UserRound, Users } from 'lucide-react';
import { useCallback, useState, type FormEvent } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { destroy as hostessDestroy, store as hostessStore, update as hostessUpdate } from '@/routes/events/hostesses';
import { ModalFooter, ModeCards, PickList, TabEmpty, TabToolbar } from './tab-kit';
import type { AvailableHostess, EventData, EventHostess } from './types';
import { initials } from '@/lib/initials';

type Props = { event: EventData; availableHostesses: AvailableHostess[] };

/** Ajout d'une hôtesse : une hôtesse de l'équipe, ou un compte créé pour l'événement. */
function AddHostessModal({ event, available, onClose }: { event: EventData; available: AvailableHostess[]; onClose: () => void }) {
    const [mode, setMode] = useState<'existing' | 'new'>(available.length ? 'existing' : 'new');
    const { data, setData, post, processing, errors, transform } = useForm({
        user_id: null as number | null,
        name: '',
        phone: '',
        password: '',
        event_site_id: event.sites.length === 1 ? String(event.sites[0].id) : '',
    });

    const close = useCallback(() => !processing && onClose(), [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => {
            const site = d.event_site_id ? Number(d.event_site_id) : null;
            return mode === 'existing' ? { mode, user_id: d.user_id, event_site_id: site } : { mode, name: d.name, phone: d.phone, password: d.password, event_site_id: site };
        });
        post(hostessStore({ event: event.id }).url, { preserveScroll: true, onSuccess: onClose, onError: toastFormError });
    };

    const canSubmit = mode === 'existing' ? data.user_id !== null : data.name.trim() !== '' && data.phone.trim() !== '' && data.password !== '';

    return (
        <Modal onClose={close} title="Ajouter une hôtesse" description={`Elle animera « ${event.name} ».`} icon={<UserPlus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
                    <ModeCards
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'existing', title: 'De votre équipe', text: 'Une hôtesse qui a déjà un compte.', icon: UserCheck },
                            { value: 'new', title: 'Recrutée pour l’événement', text: 'Un compte créé maintenant, archivé à la clôture.', icon: UserPlus },
                        ]}
                    />

                    {mode === 'existing' ? (
                        <div>
                            <PickList
                                items={available.map((h) => ({ id: h.id, title: h.name, subtitle: h.phone }))}
                                value={data.user_id}
                                onChange={(id) => setData('user_id', id)}
                                empty="Toutes vos hôtesses actives sont déjà dans l’événement."
                                searchPlaceholder="Rechercher une hôtesse"
                            />
                            {errors.user_id && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.user_id}</p>}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Nom complet" htmlFor="h-name" required error={errors.name}>
                                    <TextInput id="h-name" icon={UserRound} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Prénom Nom" error={errors.name} maxLength={255} autoFocus />
                                </Field>
                                <Field label="Téléphone" htmlFor="h-phone" required error={errors.phone}>
                                    <TextInput id="h-phone" type="tel" icon={Phone} value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="6XX XX XX XX" error={errors.phone} maxLength={25} />
                                </Field>
                            </div>
                            <Field label="Mot de passe provisoire" htmlFor="h-password" required error={errors.password} hint="à changer à la première connexion">
                                <TextInput id="h-password" type="text" autoComplete="off" icon={KeyRound} value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="Provisoire, ex. 12345 : elle le changera" error={errors.password} className="font-mono" />
                            </Field>
                            <p className="text-xs leading-relaxed text-slate-500">Elle se connecte avec son numéro de téléphone et ce mot de passe. Communiquez-le-lui directement.</p>
                        </div>
                    )}

                    {event.sites.length > 0 && (
                        <Field label="Point de vente" htmlFor="h-site" hint="(modifiable ensuite)" error={errors.event_site_id}>
                            <SelectInput id="h-site" icon={Store} value={data.event_site_id} onChange={(e) => setData('event_site_id', e.target.value)} error={errors.event_site_id}>
                                <option value="">À placer plus tard</option>
                                {event.sites.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                    )}
                </div>
                <ModalFooter onCancel={close} processing={processing} submitLabel={mode === 'new' ? 'Créer et ajouter' : 'Ajouter'} icon={<UserPlus />} disabled={!canSubmit} />
            </form>
        </Modal>
    );
}

function HostessCard({ h, event, canEdit, onRemove }: { h: EventHostess; event: EventData; canEdit: boolean; onRemove: () => void }) {
    const archived = h.status === 'archived';
    const [saving, setSaving] = useState(false);

    const assign = (value: string) =>
        router.put(hostessUpdate({ event: event.id, hostess: h.id }).url, { event_site_id: value ? Number(value) : null }, { preserveScroll: true, onStart: () => setSaving(true), onFinish: () => setSaving(false) });

    return (
        <article className={cn('flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:p-5 dark:border-sidebar-border dark:bg-card', archived && 'opacity-70')}>
            <div className="flex items-start gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold', archived ? 'bg-slate-100 text-slate-400 dark:bg-white/5' : 'bg-motriks-soft text-motriks-deep')}>{initials(h.name)}</span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{h.name}</p>
                    <p className="truncate text-xs text-slate-500">{h.phone ?? 'Sans téléphone'}</p>
                </div>
                {/* Le serveur refuse le retrait pendant l'événement */}
                {canEdit && event.status !== 'active' && <ActionButton variant="icon-danger" size="icon" icon={<Trash2 />} onClick={onRemove} aria-label={`Retirer ${h.name}`} title="Retirer" />}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {h.recruited_for_event && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Recrutée</span>}
                {archived && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/5">Archivée</span>}
            </div>

            <div className="mt-auto pt-3">
                {canEdit && event.sites.length > 0 ? (
                    <SelectInput
                        icon={Store}
                        value={h.event_site_id ? String(h.event_site_id) : ''}
                        onChange={(e) => assign(e.target.value)}
                        disabled={saving}
                        aria-label={`Point de vente de ${h.name}`}
                        className={cn('h-9 text-xs sm:text-xs', !h.event_site_id && 'border-amber-300 text-amber-700')}
                    >
                        <option value="">À placer</option>
                        {event.sites.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </SelectInput>
                ) : (
                    <p className={cn('flex items-center gap-1.5 text-xs', h.site_name ? 'text-slate-600 dark:text-slate-300' : 'text-amber-600')}>
                        <Store className="size-3.5" />
                        {h.site_name ?? 'Sans point de vente'}
                    </p>
                )}
            </div>
        </article>
    );
}

export function TabHostesses({ event, availableHostesses }: Props) {
    const [adding, setAdding] = useState(false);
    const [target, setTarget] = useState<EventHostess | null>(null);
    const [removing, setRemoving] = useState(false);

    const canEdit = !['completed', 'archived'].includes(event.status);
    const count = event.hostesses.length;
    const unplaced = event.hostesses.filter((h) => !h.event_site_id).length;

    const add = canEdit && (
        <ActionButton icon={<UserPlus />} onClick={() => setAdding(true)}>
            Ajouter une hôtesse
        </ActionButton>
    );

    const remove = () => {
        if (!target) return;
        router.delete(hostessDestroy({ event: event.id, hostess: target.id }).url, {
            preserveScroll: true,
            onStart: () => setRemoving(true),
            onFinish: () => setRemoving(false),
            onSuccess: () => setTarget(null),
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {count === 0 ? (
                <TabEmpty icon={Users} title="Aucune hôtesse" text="Ajoutez des hôtesses de votre équipe ou recrutez-en pour cet événement, puis placez-les sur un point de vente." action={add} />
            ) : (
                <>
                    <TabToolbar
                        summary={
                            <>
                                {count} hôtesse{count > 1 ? 's' : ''}
                                {unplaced > 0 && canEdit && <span className="font-medium text-amber-600"> · {unplaced} à placer</span>}
                            </>
                        }
                        action={add}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {event.hostesses.map((h) => (
                            <HostessCard key={h.id} h={h} event={event} canEdit={canEdit} onRemove={() => setTarget(h)} />
                        ))}
                    </div>
                </>
            )}

            {adding && <AddHostessModal event={event} available={availableHostesses} onClose={() => setAdding(false)} />}

            <ConfirmDialog
                open={target !== null}
                onOpenChange={(open) => !open && setTarget(null)}
                title={`Retirer ${target?.name ?? ''} ?`}
                description={target?.recruited_for_event ? 'Elle est retirée de l’événement. Son compte, créé pour l’occasion, reste dans votre personnel.' : 'Elle est retirée de l’événement ; son compte n’est pas modifié.'}
                confirmLabel="Retirer"
                loading={removing}
                onConfirm={remove}
            />
        </div>
    );
}
