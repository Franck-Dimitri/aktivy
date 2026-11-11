import { MoreHorizontal, Package, PackagePlus, Pencil, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type InventoryItem = {
    id: number;
    uuid: string;
    product_id: number;
    product_name: string;
    product_sku: string | null;
    product_unit: string;
    product_price: string | number | null;
    product_image_url: string | null;
    current_stock: number;
    alert_threshold: number;
    critical_threshold: number;
    stock_status: 'normal' | 'warning' | 'critical';
    updated_at: string;
};

type Status = InventoryItem['stock_status'];

const STATUS: Record<Status, { label: string; dot: string; text: string; bar: string; row: string }> = {
    critical: { label: 'Critique', dot: 'bg-red-500', text: 'text-red-700', bar: 'bg-red-500', row: 'bg-red-50/40' },
    warning: { label: 'Stock bas', dot: 'bg-amber-500', text: 'text-amber-700', bar: 'bg-amber-400', row: '' },
    normal: { label: 'En stock', dot: 'bg-motriks', text: 'text-slate-500', bar: 'bg-motriks', row: '' },
};

/** Ce qui demande une action d'abord. */
const ORDER: Record<Status, number> = { critical: 0, warning: 1, normal: 2 };

/** Au-delà de ce nombre de produits, une recherche s'affiche. */
const SEARCH_FROM = 8;

const fcfa = (amount: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

/**
 * Jauge du stock : remplie jusqu'au stock actuel, avec les repères des seuils d'alerte et critique.
 * L'échelle laisse de la marge au-dessus du seuil d'alerte pour voir d'un coup d'œil la réserve restante.
 */
function StockGauge({ item }: { item: InventoryItem }) {
    const scale = Math.max(item.alert_threshold * 3, item.current_stock, 1);
    const pct = (v: number) => Math.min(100, (v / scale) * 100);

    return (
        <div className="relative h-1.5 w-full rounded-full bg-slate-100" role="img" aria-label={`${item.current_stock} en stock, alerte à ${item.alert_threshold}`}>
            <div className={cn('h-full rounded-full', STATUS[item.stock_status].bar)} style={{ width: `${Math.max(pct(item.current_stock), item.current_stock > 0 ? 2 : 0)}%` }} />
            {item.critical_threshold > 0 && <span aria-hidden className="absolute -top-0.5 h-2.5 w-px bg-red-300" style={{ left: `${pct(item.critical_threshold)}%` }} />}
            {item.alert_threshold > 0 && <span aria-hidden className="absolute -top-0.5 h-2.5 w-px bg-amber-400" style={{ left: `${pct(item.alert_threshold)}%` }} />}
        </div>
    );
}

function Thumb({ item }: { item: InventoryItem }) {
    return (
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200/70">
            {item.product_image_url ? (
                <img src={item.product_image_url} alt="" className="size-full object-contain p-1 mix-blend-multiply" />
            ) : (
                <Package className="size-5 text-slate-300" strokeWidth={1.5} />
            )}
        </span>
    );
}

function StatusLabel({ status }: { status: Status }) {
    const s = STATUS[status];

    return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', s.text)}>
            <span className={cn('size-1.5 rounded-full', s.dot)} />
            {s.label}
        </span>
    );
}

type Actions = {
    readOnly: boolean;
    canRestock: boolean;
    onRestock: (item: InventoryItem) => void;
    onEdit: (item: InventoryItem) => void;
    onRemove: (item: InventoryItem) => void;
};

function RowActions({ item, readOnly, canRestock, onRestock, onEdit, onRemove }: Actions & { item: InventoryItem }) {
    if (readOnly) return null;

    return (
        <div className="flex items-center justify-end gap-1">
            {canRestock && (
                <button
                    type="button"
                    onClick={() => onRestock(item)}
                    className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors',
                        item.stock_status === 'normal'
                            ? 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                            : 'bg-motriks text-white shadow-sm hover:bg-motriks-deep',
                    )}
                >
                    <PackagePlus className="size-3.5" />
                    Réassort
                </button>
            )}
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={`Actions pour ${item.product_name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink data-[state=open]:bg-slate-100 data-[state=open]:text-ink"
                    >
                        <MoreHorizontal className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
                    <DropdownMenuItem onSelect={() => onEdit(item)} className="cursor-pointer rounded-lg">
                        <Pencil className="size-4" />
                        Corriger le stock et les seuils
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onRemove(item)} className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600 [&_svg]:text-red-500">
                        <Trash2 className="size-4" />
                        Retirer du site
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

/**
 * Inventaire d'un site : synthèse (produits, unités, valeur, à surveiller), filtre, puis chaque produit
 * avec son stock, sa jauge de seuils, sa valeur et ses actions. Critiques et stocks bas en premier.
 */
export function SiteInventory({ items, addButton, ...actions }: Actions & { items: InventoryItem[]; addButton?: ReactNode }) {
    const [filter, setFilter] = useState<'all' | 'low'>('all');
    const [query, setQuery] = useState('');

    const price = (i: InventoryItem) => Number(i.product_price ?? 0);
    const low = items.filter((i) => i.stock_status !== 'normal');
    const critical = items.filter((i) => i.stock_status === 'critical').length;
    const units = items.reduce((s, i) => s + i.current_stock, 0);
    const value = items.reduce((s, i) => s + i.current_stock * price(i), 0);

    const shown = useMemo(() => {
        const q = normalize(query.trim());

        return items
            .filter((i) => (filter === 'all' || i.stock_status !== 'normal') && (!q || normalize(`${i.product_name} ${i.product_sku ?? ''}`).includes(q)))
            .sort((a, b) => ORDER[a.stock_status] - ORDER[b.stock_status] || a.product_name.localeCompare(b.product_name, 'fr'));
    }, [items, filter, query]);

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            {/* En-tête : titre, synthèse, action */}
            <header className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-ink">Inventaire</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Le stock suivi sur ce site, mis à jour à chaque rapport et à chaque réassort.</p>
                </div>
                {addButton}
            </header>

            <dl className="grid grid-cols-2 gap-px border-y border-slate-100 bg-slate-100 sm:grid-cols-4">
                {[
                    ['Produits suivis', String(items.length), null],
                    ['Unités en stock', fcfa(units), null],
                    ['Valeur du stock', fcfa(value), 'FCFA'],
                    ['À surveiller', String(low.length), critical > 0 ? `dont ${critical} critique${critical > 1 ? 's' : ''}` : null],
                ].map(([label, v, sub]) => (
                    <div key={label} className="bg-white px-5 py-3">
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-0.5 flex items-baseline gap-1.5 text-lg font-semibold text-ink tabular-nums">
                            <span className={cn(label === 'À surveiller' && low.length > 0 && (critical > 0 ? 'text-red-600' : 'text-amber-700'))}>{v}</span>
                            {sub && <span className="text-xs font-normal text-slate-400">{sub}</span>}
                        </dd>
                    </div>
                ))}
            </dl>

            {/* Filtre et recherche */}
            <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div role="tablist" aria-label="Filtrer l’inventaire" className="inline-flex w-full gap-1 rounded-xl bg-slate-100/80 p-1 sm:w-fit">
                    {(
                        [
                            ['all', 'Tout le stock', items.length],
                            ['low', 'À surveiller', low.length],
                        ] as const
                    ).map(([key, label, count]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={filter === key}
                            onClick={() => setFilter(key)}
                            className={cn(
                                'flex h-8 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-all sm:flex-none',
                                filter === key ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                            )}
                        >
                            {label}
                            <span className={cn('rounded-full px-1.5 text-xs font-semibold tabular-nums', filter === key ? 'bg-motriks-soft text-motriks-deep' : 'text-slate-400')}>{count}</span>
                        </button>
                    ))}
                </div>

                {items.length > SEARCH_FROM && (
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Produit ou code"
                            aria-label="Rechercher un produit"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-9 text-base text-ink outline-none placeholder:text-slate-400 focus:border-motriks focus:ring-2 focus:ring-motriks/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label="Effacer" className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {shown.length === 0 ? (
                <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-400">
                    {filter === 'low' && !query ? 'Rien à surveiller : tous les produits sont au-dessus de leur seuil d’alerte.' : 'Aucun produit ne correspond.'}
                </p>
            ) : (
                <>
                    {/* Ordinateur : tableau */}
                    <table className="hidden w-full border-t border-slate-100 text-sm lg:table">
                        <thead>
                            <tr className="text-left text-xs font-medium text-slate-500">
                                <th className="py-2.5 pr-4 pl-5 font-medium">Produit</th>
                                <th className="w-[32%] px-4 py-2.5 font-medium">Stock</th>
                                <th className="px-4 py-2.5 text-right font-medium">Prix</th>
                                <th className="px-4 py-2.5 text-right font-medium">Valeur</th>
                                <th className="px-4 py-2.5 font-medium">État</th>
                                <th className="py-2.5 pr-5 pl-4">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {shown.map((item) => (
                                <tr key={item.id} className={cn('transition-colors hover:bg-slate-50/60', STATUS[item.stock_status].row)}>
                                    <td className="py-3 pr-4 pl-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Thumb item={item} />
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-ink">{item.product_name}</p>
                                                <p className="truncate text-xs text-slate-400">
                                                    {item.product_sku && <span className="font-mono">{item.product_sku} · </span>}
                                                    mis à jour {item.updated_at}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-semibold text-ink tabular-nums">{fcfa(item.current_stock)}</span>
                                            <span className="text-xs text-slate-400">{item.product_unit}</span>
                                        </div>
                                        <div className="mt-1.5 max-w-56">
                                            <StockGauge item={item} />
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
                                            Alerte {item.alert_threshold} · critique {item.critical_threshold}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 tabular-nums">{price(item) ? `${fcfa(price(item))} FCFA` : '—'}</td>
                                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-ink tabular-nums">{price(item) ? `${fcfa(price(item) * item.current_stock)} FCFA` : '—'}</td>
                                    <td className="px-4 py-3">
                                        <StatusLabel status={item.stock_status} />
                                    </td>
                                    <td className="py-3 pr-5 pl-4">
                                        <RowActions item={item} {...actions} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Téléphone et tablette : cartes */}
                    <ul className="divide-y divide-slate-100 border-t border-slate-100 lg:hidden">
                        {shown.map((item) => (
                            <li key={item.id} className={cn('px-4 py-3.5 sm:px-5', STATUS[item.stock_status].row)}>
                                <div className="flex items-center gap-3">
                                    <Thumb item={item} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">{item.product_name}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                                            <StatusLabel status={item.stock_status} />
                                            {price(item) > 0 && <span className="tabular-nums">· {fcfa(price(item) * item.current_stock)} FCFA</span>}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-lg leading-tight font-semibold text-ink tabular-nums">{fcfa(item.current_stock)}</p>
                                        <p className="text-xs text-slate-400">{item.product_unit}</p>
                                    </div>
                                </div>
                                <div className="mt-2.5 flex items-center gap-3">
                                    <div className="flex-1">
                                        <StockGauge item={item} />
                                        <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
                                            Alerte {item.alert_threshold} · critique {item.critical_threshold} · {item.updated_at}
                                        </p>
                                    </div>
                                    <RowActions item={item} {...actions} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-px bg-amber-400" /> seuil d’alerte
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-px bg-red-300" /> seuil critique
                </span>
            </p>
        </section>
    );
}
