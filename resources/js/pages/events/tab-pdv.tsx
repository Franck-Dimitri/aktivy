import { router, useForm } from '@inertiajs/react';
import { Building2, MapPin, Plus, Store, Tent, Trash2, Users } from 'lucide-react';
import { useCallback, useState, type FormEvent } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { destroy as siteDestroy, store as siteStore } from '@/routes/events/sites';
import { ModalFooter, ModeCards, PickList, TabEmpty, TabToolbar } from './tab-kit';
import type { CompanySite, EventData, EventSite } from './types';

type Props = { event: EventData; companySites: CompanySite[] };

/** Ajout d'un point de vente : un site existant de l'entreprise, ou un stand propre à l'événement. */
function AddPdvModal({ event, available, onClose }: { event: EventData; available: CompanySite[]; onClose: () => void }) {
    const [mode, setMode] = useState<'existing' | 'new'>(available.length ? 'existing' : 'new');
    const { data, setData, post, processing, errors, transform } = useForm({ site_id: null as number | null, name: '', address: '', city: event.city ?? '' });

    const close = useCallback(() => !processing && onClose(), [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => (mode === 'existing' ? { site_id: d.site_id } : { name: d.name, address: d.address, city: d.city }));
        post(siteStore({ event: event.uuid }).url, { preserveScroll: true, onSuccess: onClose, onError: toastFormError });
    };

    const canSubmit = mode === 'existing' ? data.site_id !== null : data.name.trim() !== '';

    return (
        <Modal onClose={close} title="Ajouter un point de vente" description="Où l’événement se déroule." icon={<Store />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
                    <ModeCards
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'existing', title: 'Point de vente existant', text: 'Un de vos sites, avec son stock.', icon: Store },
                            { value: 'new', title: 'Stand de l’événement', text: 'Un emplacement propre à ce salon.', icon: Tent },
                        ]}
                    />

                    {mode === 'existing' ? (
                        <div>
                            <PickList
                                items={available.map((s) => ({ id: s.id, title: s.name, subtitle: [s.address, s.city].filter(Boolean).join(', ') }))}
                                value={data.site_id}
                                onChange={(id) => setData('site_id', id)}
                                empty="Tous vos points de vente actifs sont déjà dans l’événement."
                                searchPlaceholder="Rechercher un point de vente"
                            />
                            {errors.site_id && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.site_id}</p>}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <Field label="Nom du stand" htmlFor="pdv-name" required error={errors.name}>
                                <TextInput id="pdv-name" icon={Tent} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ex. : Stand B12" error={errors.name} maxLength={255} autoFocus />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Emplacement" htmlFor="pdv-address" hint="(optionnel)" error={errors.address}>
                                    <TextInput id="pdv-address" icon={Building2} value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Hall 3, allée B" error={errors.address} maxLength={255} />
                                </Field>
                                <Field label="Ville" htmlFor="pdv-city" error={errors.city}>
                                    <TextInput id="pdv-city" icon={MapPin} value={data.city} onChange={(e) => setData('city', e.target.value)} placeholder="Douala" error={errors.city} maxLength={100} />
                                </Field>
                            </div>
                        </div>
                    )}
                </div>
                <ModalFooter onCancel={close} processing={processing} submitLabel="Ajouter" icon={<Plus />} disabled={!canSubmit} />
            </form>
        </Modal>
    );
}

function PdvCard({ site, canEdit, onDelete }: { site: EventSite; canEdit: boolean; onDelete: () => void }) {
    const linked = site.site_id !== null;
    const place = [site.address, site.city].filter(Boolean).join(', ');

    return (
        <article className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:p-5 dark:border-sidebar-border dark:bg-card">
            <div className="flex items-start gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', linked ? 'bg-motriks-soft text-motriks-deep' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10')}>
                    {linked ? <Store className="size-5" /> : <Tent className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{site.name}</p>
                    <p className="truncate text-xs text-slate-500">{place || (linked ? 'Point de vente' : 'Stand')}</p>
                </div>
                {canEdit && (
                    <ActionButton variant="icon-danger" size="icon" icon={<Trash2 />} onClick={onDelete} aria-label={`Retirer ${site.name}`} title="Retirer" />
                )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-sidebar-border">
                <span className={cn('inline-flex items-center gap-1.5', site.hostesses_count ? 'text-slate-600 dark:text-slate-300' : 'text-amber-600')}>
                    <Users className="size-3.5" />
                    {site.hostesses_count ? `${site.hostesses_count} hôtesse${site.hostesses_count > 1 ? 's' : ''}` : 'Aucune hôtesse'}
                </span>
                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', linked ? 'bg-motriks-soft text-motriks-deep' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10')}>
                    {linked ? 'Point de vente' : 'Stand'}
                </span>
            </div>
        </article>
    );
}

export function TabPdv({ event, companySites }: Props) {
    const [adding, setAdding] = useState(false);
    const [target, setTarget] = useState<EventSite | null>(null);
    const [removing, setRemoving] = useState(false);

    const canEdit = !['completed', 'archived'].includes(event.status);
    const used = event.sites.map((s) => s.site_id).filter(Boolean);
    const available = companySites.filter((s) => !used.includes(s.id));
    const count = event.sites.length;

    const add = canEdit && (
        <ActionButton icon={<Plus />} onClick={() => setAdding(true)}>
            Ajouter un point de vente
        </ActionButton>
    );

    const remove = () => {
        if (!target) return;
        router.delete(siteDestroy({ event: event.uuid, eventSite: target.uuid }).url, {
            preserveScroll: true,
            onStart: () => setRemoving(true),
            onFinish: () => setRemoving(false),
            onSuccess: () => setTarget(null),
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {count === 0 ? (
                <TabEmpty icon={MapPin} title="Aucun point de vente" text="Ajoutez vos points de vente habituels ou créez des stands propres à cet événement." action={add} />
            ) : (
                <>
                    <TabToolbar summary={`${count} point${count > 1 ? 's' : ''} de vente`} action={add} />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {event.sites.map((site) => (
                            <PdvCard key={site.id} site={site} canEdit={canEdit} onDelete={() => setTarget(site)} />
                        ))}
                    </div>
                </>
            )}

            {adding && <AddPdvModal event={event} available={available} onClose={() => setAdding(false)} />}

            <ConfirmDialog
                open={target !== null}
                onOpenChange={(open) => !open && setTarget(null)}
                title={`Retirer « ${target?.name ?? ''} » ?`}
                description={target?.hostesses_count ? `Les ${target.hostesses_count} hôtesse(s) placées ici n’auront plus de point de vente dans l’événement.` : 'Le point de vente est retiré de l’événement.'}
                confirmLabel="Retirer"
                loading={removing}
                onConfirm={remove}
            />
        </div>
    );
}
