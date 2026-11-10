import { Minus, Plus, Store, Trash2, X } from 'lucide-react';
import { useId } from 'react';
import type { ExternalShopSales } from '@/components/external-sales';
import { cn } from '@/lib/utils';

/** Produit de son point de vente, proposé pour une vente en boutique extérieure (même prix). */
export type ExternalProduct = { id: number; name: string; unit: string; unit_price: number };

export type ExternalItem = { key: string; product_id: number | null; units: number };
export type ExternalShop = { key: string; name: string; items: ExternalItem[] };

let seq = 0;
const newKey = () => `x${Date.now().toString(36)}${(seq++).toString(36)}`;

export const emptyItem = (): ExternalItem => ({ key: newKey(), product_id: null, units: 1 });

/** Ventes enregistrées sur le serveur, remises sous forme de saisie. */
export function shopsFromSales(sales: ExternalShopSales[]): ExternalShop[] {
    return sales.map((s) => ({
        key: newKey(),
        name: s.shop,
        items: s.lines.map((l) => ({ key: newKey(), product_id: l.product_id, units: l.units })),
    }));
}

/** Lignes complètes (boutique nommée, produit choisi, au moins une unité), prêtes à envoyer. */
export function externalPayload(shops: ExternalShop[]): { shop: string; product_id: number; units: number }[] {
    return shops.flatMap((s) =>
        s.name.trim() === ''
            ? []
            : s.items
                  .filter((i) => i.product_id !== null && i.units > 0)
                  .map((i) => ({ shop: s.name.trim(), product_id: i.product_id as number, units: i.units })),
    );
}

/**
 * Saisie à compléter : une boutique commencée sans nom, ou un produit pas encore choisi.
 * Une boutique laissée entièrement vide est simplement ignorée.
 */
export function externalIncomplete(shops: ExternalShop[]): boolean {
    return shops.some((s) => {
        const untouched = s.name.trim() === '' && s.items.every((i) => i.product_id === null);

        return !untouched && (s.name.trim() === '' || s.items.some((i) => i.product_id === null));
    });
}

export function externalTotals(shops: ExternalShop[], products: ExternalProduct[]): { revenue: number; units: number } {
    const price = new Map(products.map((p) => [p.id, p.unit_price]));

    return externalPayload(shops).reduce(
        (t, l) => ({ revenue: t.revenue + l.units * (price.get(l.product_id) ?? 0), units: t.units + l.units }),
        { revenue: 0, units: 0 },
    );
}

const fcfa = (amount: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);

/**
 * Saisie des ventes en boutique extérieure : une carte par boutique, ses produits et leurs quantités.
 * Mêmes produits et mêmes prix que le point de vente ; le stock du point de vente ne bouge pas.
 */
export function ExternalSalesEditor({
    shops,
    products,
    suggestions,
    onChange,
    disabled,
}: {
    shops: ExternalShop[];
    products: ExternalProduct[];
    suggestions: string[];
    onChange: (shops: ExternalShop[]) => void;
    disabled?: boolean;
}) {
    const listId = useId();
    const byId = new Map(products.map((p) => [p.id, p]));

    const updateShop = (key: string, patch: Partial<ExternalShop>) => onChange(shops.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    const updateItem = (shop: ExternalShop, key: string, patch: Partial<ExternalItem>) =>
        updateShop(shop.key, { items: shop.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) });

    if (products.length === 0) {
        return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">Aucun produit sur votre point de vente.</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <datalist id={listId}>
                {suggestions.map((s) => (
                    <option key={s} value={s} />
                ))}
            </datalist>

            {shops.map((shop) => {
                const shopTotal = shop.items.reduce((t, i) => t + (i.product_id ? i.units * (byId.get(i.product_id)?.unit_price ?? 0) : 0), 0);

                return (
                    <div key={shop.key} className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                        {/* Boutique */}
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
                            <Store className="size-4 shrink-0 text-slate-400" />
                            <input
                                value={shop.name}
                                list={listId}
                                onChange={(e) => updateShop(shop.key, { name: e.target.value })}
                                maxLength={120}
                                disabled={disabled}
                                placeholder="Nom de la boutique"
                                aria-label="Nom de la boutique extérieure"
                                className={cn(
                                    'h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base font-medium text-ink outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-motriks focus:ring-2 focus:ring-motriks/20 sm:text-sm',
                                    shop.name.trim() === '' ? 'border-amber-300' : 'border-slate-200',
                                )}
                            />
                            {shopTotal > 0 && (
                                <span className="hidden shrink-0 text-sm font-bold text-motriks-deep tabular-nums sm:inline">{fcfa(shopTotal)} FCFA</span>
                            )}
                            <button
                                type="button"
                                onClick={() => onChange(shops.filter((s) => s.key !== shop.key))}
                                disabled={disabled}
                                aria-label={`Retirer la boutique ${shop.name || ''}`}
                                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>

                        {/* Produits vendus dans cette boutique */}
                        <ul className="divide-y divide-slate-100">
                            {shop.items.map((item) => {
                                const product = item.product_id ? byId.get(item.product_id) : undefined;

                                return (
                                    <li key={item.key} className="flex flex-wrap items-center gap-2.5 px-3 py-2.5">
                                        <select
                                            value={item.product_id ?? ''}
                                            onChange={(e) => updateItem(shop, item.key, { product_id: e.target.value ? Number(e.target.value) : null })}
                                            disabled={disabled}
                                            aria-label="Produit vendu"
                                            className={cn(
                                                'h-11 min-w-0 flex-1 basis-48 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:border-motriks focus:ring-2 focus:ring-motriks/20 sm:text-sm',
                                                item.product_id === null ? 'border-amber-300 text-slate-500' : 'border-slate-200',
                                            )}
                                        >
                                            <option value="">Choisir un produit…</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} · {fcfa(p.unit_price)} FCFA
                                                </option>
                                            ))}
                                        </select>

                                        <div className="inline-flex items-center rounded-xl bg-slate-100 p-1">
                                            <button
                                                type="button"
                                                onClick={() => updateItem(shop, item.key, { units: Math.max(1, item.units - 1) })}
                                                disabled={disabled || item.units <= 1}
                                                aria-label="Une unité de moins"
                                                className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm active:scale-90 disabled:opacity-40"
                                            >
                                                <Minus className="size-4" />
                                            </button>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                value={item.units}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateItem(shop, item.key, { units: Math.max(1, Math.min(100000, Number(e.target.value) || 1)) })}
                                                disabled={disabled}
                                                aria-label="Unités vendues"
                                                className="h-9 w-14 bg-transparent text-center text-base font-bold text-ink tabular-nums outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => updateItem(shop, item.key, { units: Math.min(100000, item.units + 1) })}
                                                disabled={disabled}
                                                aria-label="Une unité de plus"
                                                className="flex size-9 items-center justify-center rounded-lg bg-motriks text-white shadow-sm active:scale-90 disabled:opacity-40"
                                            >
                                                <Plus className="size-4" />
                                            </button>
                                        </div>

                                        <span className="w-24 shrink-0 text-right text-sm font-semibold text-ink tabular-nums">
                                            {product ? `${fcfa(item.units * product.unit_price)}` : '—'}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                shop.items.length > 1
                                                    ? updateShop(shop.key, { items: shop.items.filter((i) => i.key !== item.key) })
                                                    : onChange(shops.filter((s) => s.key !== shop.key))
                                            }
                                            disabled={disabled}
                                            aria-label="Retirer ce produit"
                                            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink disabled:opacity-40"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        <button
                            type="button"
                            onClick={() => updateShop(shop.key, { items: [...shop.items, emptyItem()] })}
                            disabled={disabled}
                            className="flex w-full items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-motriks-deep transition-colors hover:bg-motriks-soft/50 disabled:opacity-40"
                        >
                            <Plus className="size-4" />
                            Ajouter un produit
                        </button>
                    </div>
                );
            })}

            <button
                type="button"
                onClick={() => onChange([...shops, { key: newKey(), name: '', items: [emptyItem()] }])}
                disabled={disabled}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 transition-colors hover:border-motriks hover:bg-motriks-soft/40 hover:text-motriks-deep disabled:opacity-40"
            >
                <Plus className="size-4" />
                {shops.length === 0 ? 'Ajouter une boutique extérieure' : 'Ajouter une autre boutique'}
            </button>
        </div>
    );
}
