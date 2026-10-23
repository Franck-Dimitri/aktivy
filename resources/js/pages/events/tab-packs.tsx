import { router, useForm } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Gift, Package, PackagePlus, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { GlowCard } from '@/components/page/surface';
import { ActionButton } from '@/components/page/buttons';
import { TextInput, TextArea, SelectInput } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';
import { store as packStore, destroy as packDestroy } from '@/routes/events/packs';
import { formatMoney } from './types';
import type { CompanyProduct, EventData } from './types';

type PackLineForm = { product_id: string; quantity: number; role: 'paid' | 'free'; unit_price: string };
type Props = { event: EventData; companyProducts: CompanyProduct[] };
const EMPTY_LINE: PackLineForm = { product_id: '', quantity: 1, role: 'paid', unit_price: '' };

const PACK_TYPE_CONFIG = {
    grouped_discount: {
        icon:       Package,
        label:      'Bundle prix réduit',
        accent:     'text-indigo-600',
        bg:         'bg-indigo-50',
        ring:       'ring-indigo-100',
        strip:      'bg-indigo-500',
        badge:      'bg-indigo-50 text-indigo-700 ring-indigo-100',
    },
    buy_get_free: {
        icon:       Gift,
        label:      'Acheté / offert',
        accent:     'text-aktivy',
        bg:         'bg-aktivy-soft',
        ring:       'ring-green-100',
        strip:      'bg-aktivy',
        badge:      'bg-aktivy-soft text-aktivy-deep ring-green-100',
    },
};

function PackCard({ pack, canEdit, onDelete }: {
    pack: EventData['packs'][0];
    canEdit: boolean;
    onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const cfg = PACK_TYPE_CONFIG[pack.type as keyof typeof PACK_TYPE_CONFIG];
    const Icon = cfg.icon;

    return (
        <div className={cn('overflow-hidden rounded-2xl bg-white ring-1', cfg.ring)}>
            {/* Colored top strip */}
            <div className={cn('h-1', cfg.strip)} />

            {/* Header */}
            <button
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl ring-1', cfg.bg, cfg.ring)}>
                    <Icon className={cn('size-5', cfg.accent)} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{pack.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', cfg.badge)}>
                            {cfg.label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                            {pack.lines.length} produit{pack.lines.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {pack.price !== null && (
                        <span className="text-base font-black tabular-nums text-slate-800">
                            {formatMoney(pack.price)}
                            <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                        </span>
                    )}
                    {!pack.active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            Inactif
                        </span>
                    )}
                    {expanded
                        ? <ChevronUp className="size-4 text-slate-400" />
                        : <ChevronDown className="size-4 text-slate-400" />}
                </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    {pack.description && (
                        <p className="mb-4 text-sm text-slate-500">{pack.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {pack.lines.map((l) => (
                            <span
                                key={l.id}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1',
                                    l.role === 'free'
                                        ? 'bg-green-50 text-green-700 ring-green-100'
                                        : 'bg-slate-100 text-slate-600 ring-slate-200',
                                )}
                            >
                                {l.role === 'free' && <Gift className="size-3" />}
                                <span className="font-bold tabular-nums">{l.quantity}×</span>
                                {l.product.name}
                                {l.unit_price !== null && (
                                    <span className="text-[10px] opacity-60">
                                        {formatMoney(l.unit_price)} FCFA
                                    </span>
                                )}
                                {l.role === 'free' && (
                                    <span className="rounded-full bg-green-100 px-1 py-0.5 text-[9px] font-bold uppercase text-green-700">
                                        offert
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>

                    {canEdit && (
                        <div className="mt-4 flex justify-end border-t border-slate-50 pt-3">
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="size-3.5" />
                                Supprimer ce pack
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function TabPacks({ event, companyProducts }: Props) {
    const [showForm, setShowForm] = useState(false);

    const canEdit = !['completed', 'archived'].includes(event.status);

    const { data, setData, post, processing, reset } = useForm<{
        name: string;
        description: string;
        type: 'grouped_discount' | 'buy_get_free';
        price: string;
        lines: PackLineForm[];
    }>({
        name:        '',
        description: '',
        type:        'grouped_discount',
        price:       '',
        lines:       [{ ...EMPTY_LINE }],
    });

    function addLine() { setData('lines', [...data.lines, { ...EMPTY_LINE }]); }
    function removeLine(i: number) { setData('lines', data.lines.filter((_, idx) => idx !== i)); }
    function updateLine(i: number, field: keyof PackLineForm, value: string | number) {
        const lines = [...data.lines];
        lines[i] = { ...lines[i], [field]: value };
        setData('lines', lines);
    }
    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(packStore({ event: event.id }).url, {
            // @ts-expect-error transform is supported by Inertia useForm
            transform: (d: typeof data) => ({
                ...d,
                price: d.price !== '' ? Number(d.price) : null,
                lines: d.lines.map((l) => ({
                    ...l,
                    product_id: Number(l.product_id),
                    unit_price: l.unit_price !== '' ? Number(l.unit_price) : null,
                })),
            }),
            onSuccess: () => { reset(); setShowForm(false); },
        });
    }

    const cfg = PACK_TYPE_CONFIG[data.type];

    return (
        <div className="flex flex-col gap-4">
            {canEdit && (
                <div className="flex justify-end">
                    <ActionButton icon={<PackagePlus />} onClick={() => setShowForm(!showForm)} variant="secondary">
                        Créer un pack
                    </ActionButton>
                </div>
            )}

            {showForm && (
                <GlowCard contentClassName="p-5" className="max-w-2xl">
                    {/* Type selector */}
                    <div className="mb-5 grid grid-cols-2 gap-2">
                        {(['grouped_discount', 'buy_get_free'] as const).map((t) => {
                            const c = PACK_TYPE_CONFIG[t];
                            const Icon = c.icon;
                            const selected = data.type === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setData('type', t)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-colors',
                                        selected
                                            ? cn('border-transparent ring-1', c.bg, c.ring, c.accent)
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300',
                                    )}
                                >
                                    <Icon className={cn('size-4 shrink-0', selected ? c.accent : 'text-slate-400')} />
                                    <span className="text-xs leading-tight">{c.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-ink">Nom du pack</label>
                                <TextInput
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="ex. Pack Découverte"
                                />
                            </div>
                            {data.type === 'grouped_discount' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Prix bundle (FCFA)</label>
                                    <TextInput
                                        type="number"
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-ink">Description</label>
                            <TextArea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={2}
                                placeholder="Optionnel"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-ink">Produits dans le pack</label>
                                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', cfg.badge)}>
                                    {data.lines.length} produit{data.lines.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            {data.lines.map((line, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                                    <SelectInput
                                        value={line.product_id}
                                        onChange={(e) => updateLine(i, 'product_id', e.target.value)}
                                        className="flex-1"
                                    >
                                        <option value="">-- Produit --</option>
                                        {companyProducts.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </SelectInput>
                                    <TextInput
                                        type="number"
                                        value={line.quantity}
                                        onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                                        placeholder="Qté"
                                        className="w-16"
                                    />
                                    {data.type === 'buy_get_free' && (
                                        <SelectInput
                                            value={line.role}
                                            onChange={(e) => updateLine(i, 'role', e.target.value as 'paid' | 'free')}
                                            className="w-28"
                                        >
                                            <option value="paid">Payant</option>
                                            <option value="free">Offert</option>
                                        </SelectInput>
                                    )}
                                    {data.lines.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeLine(i)}
                                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addLine}
                                className={cn('flex items-center gap-1.5 text-xs font-semibold hover:underline', cfg.accent)}
                            >
                                <Plus className="size-3.5" /> Ajouter un produit
                            </button>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                            <ActionButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                Annuler
                            </ActionButton>
                            <ActionButton type="submit" icon={<PackagePlus />} loading={processing}>
                                Créer le pack
                            </ActionButton>
                        </div>
                    </form>
                </GlowCard>
            )}

            {event.packs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                        <Package className="size-6 text-indigo-400" />
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-700">Aucun pack produit</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">
                        Créez des bundles à prix réduit ou des offres "acheté/offert" pour cet événement.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {event.packs.map((pack) => (
                        <PackCard
                            key={pack.id}
                            pack={pack}
                            canEdit={canEdit}
                            onDelete={() => router.delete(packDestroy({ event: event.id, pack: pack.id }).url)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
