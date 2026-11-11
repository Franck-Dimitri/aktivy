import { router, useForm } from '@inertiajs/react';
import { Check, ChevronDown, Gift, Minus, Package, PackagePlus, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { Field, SelectInput, TextArea, TextInput, ToggleField } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { destroy as packDestroy, store as packStore, update as packUpdate } from '@/routes/events/packs';
import { ModalFooter, ModeCards, TabEmpty, TabToolbar } from './tab-kit';
import { formatMoney } from './types';
import type { CompanyProduct, EventData, EventPack } from './types';

type PackType = 'grouped_discount' | 'buy_get_free';
type Props = { event: EventData; companyProducts: CompanyProduct[] };


const TYPES: Record<PackType, { label: string; text: string; icon: typeof Package; tile: string }> = {
    grouped_discount: { label: 'Lot à prix réduit', text: 'Plusieurs produits vendus ensemble à un prix unique.', icon: Package, tile: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10' },
    buy_get_free: { label: 'Acheté / offert', text: 'Des produits payants, d’autres offerts (ex. 2 achetés, 1 offert).', icon: Gift, tile: 'bg-motriks-soft text-motriks-deep' },
};

type Item = { product_id: string; quantity: number; unit_price?: number | null };
const EMPTY_ITEM: Item = { product_id: '', quantity: 1 };

/** Une ligne produit : produit + quantité (− / +) + retrait. */
function ItemRow({ item, products, onChange, onRemove, label, accent }: { item: Item; products: CompanyProduct[]; onChange: (patch: Partial<Item>) => void; onRemove?: () => void; label: string; accent?: boolean }) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-2.5 last:border-0 sm:flex-nowrap dark:border-sidebar-border">
            <div className="min-w-0 grow basis-full sm:basis-0">
                <SelectInput value={item.product_id} onChange={(e) => onChange({ product_id: e.target.value })} aria-label={label} className="h-10">
                    <option value="">Choisir un produit…</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </SelectInput>
            </div>
            <div className={cn('flex h-10 shrink-0 items-center rounded-xl border', accent ? 'border-motriks/30 bg-motriks-soft/40' : 'border-slate-200 dark:border-sidebar-border')} aria-label="Quantité">
                <button type="button" onClick={() => onChange({ quantity: Math.max(1, item.quantity - 1) })} disabled={item.quantity <= 1} className="flex size-9 items-center justify-center text-slate-500 hover:text-ink disabled:opacity-40" aria-label="Moins">
                    <Minus className="size-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-semibold text-ink tabular-nums">{item.quantity}</span>
                <button type="button" onClick={() => onChange({ quantity: item.quantity + 1 })} className="flex size-9 items-center justify-center text-slate-500 hover:text-ink" aria-label="Plus">
                    <Plus className="size-3.5" />
                </button>
            </div>
            {onRemove && (
                <button type="button" onClick={onRemove} aria-label="Retirer la ligne" className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:ml-0">
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}

/** Bloc de lignes avec titre et bouton d'ajout. */
function ItemBlock({ title, hint, items, products, onChange, addLabel, accent, extra }: { title: ReactNode; hint?: string; items: Item[]; products: CompanyProduct[]; onChange: (items: Item[]) => void; addLabel: string; accent?: boolean; extra?: ReactNode }) {
    return (
        <div>
            <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    {hint && <p className="text-xs text-slate-500">{hint}</p>}
                </div>
                {extra}
            </div>
            <div className={cn('overflow-hidden rounded-xl border', accent ? 'border-motriks/25' : 'border-slate-200 dark:border-sidebar-border')}>
                {items.map((item, i) => (
                    <ItemRow
                        key={i}
                        item={item}
                        products={products}
                        label={`${addLabel} ${i + 1}`}
                        accent={accent}
                        onChange={(patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))}
                        onRemove={items.length > 1 ? () => onChange(items.filter((_, idx) => idx !== i)) : undefined}
                    />
                ))}
                <button
                    type="button"
                    onClick={() => onChange([...items, { ...EMPTY_ITEM }])}
                    className={cn('flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors', accent ? 'bg-motriks-soft/40 text-motriks-deep hover:bg-motriks-soft/70' : 'bg-slate-50/70 text-motriks-deep hover:bg-motriks-soft/60 dark:bg-white/[0.02]')}
                >
                    <Plus className="size-3.5" />
                    {addLabel}
                </button>
            </div>
        </div>
    );
}

/** « 2 Jus mangue » / « 2 Jus mangue et 1 Biscuits » */
function listItems(items: Item[], name: (id: string) => string | undefined): string {
    const parts = items.filter((i) => i.product_id).map((i) => `${i.quantity} ${name(i.product_id) ?? '…'}`);
    return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

/** Lignes d'un pack enregistré, au format du formulaire. */
const toItems = (lines: EventPack['lines']): Item[] => lines.map((l) => ({ product_id: String(l.product_id), quantity: l.quantity, unit_price: l.unit_price }));

/**
 * Création ou modification d'un pack d'événement : lot à prix réduit, ou offre « acheté / offert »
 * (X achetés, Y offerts). En modification, le formulaire part du pack enregistré.
 */
function PackModal({ event, products, pack, onClose }: { event: EventData; products: CompanyProduct[]; pack?: EventPack; onClose: () => void }) {
    const paid = pack ? toItems(pack.lines.filter((l) => l.role === 'paid')) : [];
    const gift = pack ? toItems(pack.lines.filter((l) => l.role === 'free')) : [];
    const { data, setData, post, put, processing, errors, transform } = useForm<{ name: string; description: string; type: PackType; price: string; active: boolean; lines: Item[]; buy: Item[]; free: Item[] }>({
        name: pack?.name ?? '',
        description: pack?.description ?? '',
        type: pack?.type ?? 'buy_get_free',
        price: pack?.price != null ? String(pack.price) : '',
        active: pack?.active ?? true,
        lines: pack?.type === 'grouped_discount' && paid.length ? paid : [{ ...EMPTY_ITEM }],
        buy: pack?.type === 'buy_get_free' && paid.length ? paid : [{ product_id: '', quantity: 2 }],
        free: pack?.type === 'buy_get_free' && gift.length ? gift : [{ ...EMPTY_ITEM }],
    });

    const close = useCallback(() => !processing && onClose(), [processing, onClose]);
    const name = (id: string) => products.find((p) => String(p.id) === id)?.name;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => {
            // Le prix unitaire éventuel d'une ligne existante est conservé
            const line = (i: Item, role: 'paid' | 'free') => ({ product_id: i.product_id ? Number(i.product_id) : null, quantity: i.quantity, role, unit_price: i.unit_price ?? null });
            return {
                name: d.name,
                description: d.description,
                type: d.type,
                ...(pack ? { active: d.active } : {}),
                price: d.type === 'grouped_discount' && d.price !== '' ? Number(d.price) : null,
                lines:
                    d.type === 'grouped_discount'
                        ? d.lines.map((i) => line(i, 'paid'))
                        : [...d.buy.map((i) => line(i, 'paid')), ...d.free.map((i) => line(i, 'free'))],
            };
        });
        const options = { preserveScroll: true, onSuccess: onClose, onError: toastFormError };
        if (pack) {
            put(packUpdate({ event: event.uuid, pack: pack.uuid }).url, options);
        } else {
            post(packStore({ event: event.uuid }).url, options);
        }
    };

    const lineErrors = [...new Set(Object.entries(errors).filter(([k]) => k === 'lines' || k.startsWith('lines.')).map(([, m]) => m))];

    const isOffer = data.type === 'buy_get_free';
    const buyReady = data.buy.some((i) => i.product_id);
    const freeReady = data.free.some((i) => i.product_id);
    const canSubmit = data.name.trim() !== '' && (isOffer ? buyReady && freeReady : data.lines.some((i) => i.product_id) && data.price !== '');

    // « Achetez 2 Jus mangue, le 3e offert » quand achat et cadeau portent sur un seul et même produit
    const single = isOffer && data.buy.filter((i) => i.product_id).length === 1 && data.free.filter((i) => i.product_id).length === 1 && data.buy.find((i) => i.product_id)!.product_id === data.free.find((i) => i.product_id)!.product_id;
    const offerSentence = !isOffer
        ? ''
        : single
          ? (() => {
                const b = data.buy.find((i) => i.product_id)!;
                const f = data.free.find((i) => i.product_id)!;
                return f.quantity === 1 ? `Achetez ${b.quantity} ${name(b.product_id)}, le ${b.quantity + 1}e offert` : `Achetez ${b.quantity} ${name(b.product_id)}, recevez-en ${f.quantity} de plus offerts`;
            })()
          : buyReady && freeReady
            ? `Achetez ${listItems(data.buy, name)}, recevez ${listItems(data.free, name)} offert${data.free.reduce((n, i) => n + (i.product_id ? i.quantity : 0), 0) > 1 ? 's' : ''}`
            : '';

    const sameAsBuy = () => {
        const first = data.buy.find((i) => i.product_id);
        if (first) setData('free', [{ product_id: first.product_id, quantity: data.free[0]?.quantity ?? 1 }]);
    };

    return (
        <Modal onClose={close} title={pack ? 'Modifier le pack' : 'Créer un pack'} description={pack ? `« ${pack.name} »` : 'Une offre promotionnelle vendue par les hôtesses.'} size="lg" icon={pack ? <Pencil /> : <PackagePlus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-col gap-6 overflow-y-auto px-6 pt-3 pb-6">
                    <ModeCards value={data.type} onChange={(t) => setData('type', t)} options={(Object.keys(TYPES) as PackType[]).map((t) => ({ value: t, title: TYPES[t].label, text: TYPES[t].text, icon: TYPES[t].icon }))} />

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                        <Field label="Nom du pack" htmlFor="p-name" required error={errors.name} className={isOffer ? 'sm:col-span-2' : undefined}>
                            <TextInput id="p-name" icon={Tag} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder={isOffer ? 'Ex. : 2 achetés, 1 offert' : 'Ex. : Pack Découverte'} error={errors.name} maxLength={255} autoFocus />
                        </Field>
                        {!isOffer && (
                            <Field label="Prix du lot" htmlFor="p-price" required error={errors.price}>
                                <TextInput
                                    id="p-price"
                                    inputMode="numeric"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value.replace(/[^\d]/g, ''))}
                                    placeholder="0"
                                    error={errors.price}
                                    trailing={<span className="text-xs font-medium text-slate-400">FCFA</span>}
                                    className="text-right tabular-nums"
                                />
                            </Field>
                        )}
                    </div>

                    {isOffer ? (
                        <div className="flex flex-col gap-3">
                            <ItemBlock title="Le client achète" hint="Au prix habituel" items={data.buy} products={products} onChange={(buy) => setData('buy', buy)} addLabel="Ajouter un produit acheté" />

                            <div className="flex items-center justify-center" aria-hidden>
                                <span className="flex size-8 items-center justify-center rounded-full bg-motriks text-white shadow-sm">
                                    <Gift className="size-4" />
                                </span>
                            </div>

                            <ItemBlock
                                title="Il reçoit en cadeau"
                                hint="Sortis du stock, sans être facturés"
                                items={data.free}
                                products={products}
                                onChange={(free) => setData('free', free)}
                                addLabel="Ajouter un produit offert"
                                accent
                                extra={
                                    buyReady && (
                                        <button type="button" onClick={sameAsBuy} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-motriks-deep transition-colors hover:bg-motriks-soft">
                                            Même produit
                                        </button>
                                    )
                                }
                            />
                        </div>
                    ) : (
                        <ItemBlock title="Produits du lot" hint="Vendus ensemble au prix du lot" items={data.lines} products={products} onChange={(lines) => setData('lines', lines)} addLabel="Ajouter un produit" />
                    )}

                    {lineErrors.map((m) => (
                        <p key={m} role="alert" className="-mt-3 text-xs font-medium text-red-600">
                            {m}
                        </p>
                    ))}

                    {(offerSentence || (!isOffer && data.lines.some((i) => i.product_id))) && (
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3.5 dark:border-sidebar-border dark:bg-white/[0.03]">
                            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">L’hôtesse proposera</p>
                            <p className="mt-1 text-[15px] font-semibold text-ink">
                                {isOffer ? (
                                    offerSentence
                                ) : (
                                    <>
                                        {listItems(data.lines, name)}
                                        {data.price && <span className="text-motriks-deep"> pour {formatMoney(Number(data.price))} FCFA</span>}
                                    </>
                                )}
                            </p>
                        </div>
                    )}

                    <Field label="Description" htmlFor="p-desc" hint="(optionnel)" error={errors.description}>
                        <TextArea id="p-desc" rows={2} value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Argumentaire pour les hôtesses, conditions…" error={errors.description} maxLength={1000} />
                    </Field>

                    {pack && (
                        <>
                            <ToggleField
                                checked={data.active}
                                onChange={(v) => setData('active', v)}
                                label="Pack proposé aux hôtesses"
                                description={data.active ? 'Les hôtesses peuvent le vendre.' : 'Masqué dans leur saisie : il ne peut plus être vendu.'}
                            />
                            {event.status === 'active' && (
                                <p className="-mt-2 text-xs leading-relaxed text-slate-500">L’événement est en cours : les ventes déjà déclarées gardent l’offre d’origine, la nouvelle s’applique aux prochaines saisies.</p>
                            )}
                        </>
                    )}
                </div>
                <ModalFooter onCancel={close} processing={processing} submitLabel={pack ? 'Enregistrer' : 'Créer le pack'} icon={pack ? <Check /> : <PackagePlus />} disabled={!canSubmit} />
            </form>
        </Modal>
    );
}

function PackCard({ pack, canEdit, onEdit, onDelete }: { pack: EventPack; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const t = TYPES[pack.type] ?? TYPES.grouped_discount;
    const Icon = t.icon;

    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/60 sm:px-5 dark:hover:bg-white/[0.02]">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.tile)}>
                    <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-semibold text-ink">{pack.name}</span>
                        {!pack.active && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/5">Inactif</span>}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                        {t.label} ·{' '}
                        {pack.type === 'buy_get_free'
                            ? (() => {
                                  const paid = pack.lines.filter((l) => l.role === 'paid').reduce((n, l) => n + l.quantity, 0);
                                  const free = pack.lines.filter((l) => l.role === 'free').reduce((n, l) => n + l.quantity, 0);
                                  return `${paid} acheté${paid > 1 ? 's' : ''} · ${free} offert${free > 1 ? 's' : ''}`;
                              })()
                            : `${pack.lines.length} produit${pack.lines.length > 1 ? 's' : ''}`}
                    </span>
                </span>
                {pack.price !== null && (
                    <span className="shrink-0 text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
                        {formatMoney(pack.price)} <span className="text-xs font-medium text-slate-400">FCFA</span>
                    </span>
                )}
                <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="border-t border-slate-100 px-4 py-4 sm:px-5 dark:border-sidebar-border">
                    {pack.description && <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{pack.description}</p>}
                    <ul className="flex flex-col gap-1.5">
                        {pack.lines.map((l) => (
                            <li key={l.id} className="flex items-center gap-2 text-sm">
                                <span className="w-8 shrink-0 font-semibold text-ink tabular-nums">{l.quantity} ×</span>
                                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{l.product.name}</span>
                                {l.role === 'free' ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-motriks-soft px-1.5 py-0.5 text-[10px] font-semibold text-motriks-deep">
                                        <Gift className="size-3" />
                                        Offert
                                    </span>
                                ) : (
                                    l.unit_price !== null && <span className="text-xs text-slate-400 tabular-nums">{formatMoney(l.unit_price)} FCFA</span>
                                )}
                            </li>
                        ))}
                    </ul>
                    {canEdit && (
                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-sidebar-border">
                            <ActionButton variant="ghost" size="sm" icon={<Trash2 />} onClick={onDelete} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                Supprimer
                            </ActionButton>
                            <ActionButton variant="secondary" size="sm" icon={<Pencil />} onClick={onEdit}>
                                Modifier
                            </ActionButton>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export function TabPacks({ event, companyProducts }: Props) {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<EventPack | null>(null);
    const [target, setTarget] = useState<EventPack | null>(null);
    const [removing, setRemoving] = useState(false);

    const canEdit = !['completed', 'archived'].includes(event.status);
    const count = event.packs.length;

    const add = canEdit && (
        <ActionButton icon={<PackagePlus />} onClick={() => setCreating(true)}>
            Créer un pack
        </ActionButton>
    );

    const remove = () => {
        if (!target) return;
        router.delete(packDestroy({ event: event.uuid, pack: target.uuid }).url, {
            preserveScroll: true,
            onStart: () => setRemoving(true),
            onFinish: () => setRemoving(false),
            onSuccess: () => setTarget(null),
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {count === 0 ? (
                <TabEmpty icon={Package} title="Aucun pack" text="Facultatif : créez des lots à prix réduit ou des offres « acheté / offert » que les hôtesses pourront vendre." action={add} />
            ) : (
                <>
                    <TabToolbar summary={`${count} pack${count > 1 ? 's' : ''}`} action={add} />
                    <div className="flex flex-col gap-3">
                        {event.packs.map((pack) => (
                            <PackCard key={pack.id} pack={pack} canEdit={canEdit} onEdit={() => setEditing(pack)} onDelete={() => setTarget(pack)} />
                        ))}
                    </div>
                </>
            )}

            {creating && <PackModal event={event} products={companyProducts} onClose={() => setCreating(false)} />}
            {editing && <PackModal key={editing.id} event={event} products={companyProducts} pack={editing} onClose={() => setEditing(null)} />}

            <ConfirmDialog
                open={target !== null}
                onOpenChange={(open) => !open && setTarget(null)}
                title={`Supprimer « ${target?.name ?? ''} » ?`}
                description="Le pack n’est plus proposé aux hôtesses. Les ventes déjà déclarées sont conservées."
                confirmLabel="Supprimer"
                loading={removing}
                onConfirm={remove}
            />
        </div>
    );
}
