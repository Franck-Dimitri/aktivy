import { Head } from '@inertiajs/react';
import { AlertTriangle, Package, Search, Store, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { ProductImage } from '@/components/page/product-image';
import { StatStrip } from '@/components/page/stat-strip';
import { cn } from '@/lib/utils';
import { stock as terrainStock } from '@/routes/terrain';

type StockStatus = 'normal' | 'warning' | 'critical';

type StockProduct = {
    id: number;
    name: string;
    unit: string;
    price: number;
    stock: number;
    alert_threshold: number;
    critical_threshold: number;
    status: StockStatus;
    image_url: string | null;
};

type SiteStock = {
    id: number;
    name: string | null;
    city: string | null;
    updated_at: string | null;
    totals: { products: number; units: number; value: number; warning: number; critical: number };
    products: StockProduct[];
};

type Filter = 'all' | 'low';

const card = 'rounded-2xl border border-slate-200/80 bg-white';

const STATUS: Record<StockStatus, { label: string; badge: string; bar: string }> = {
    normal: { label: 'En stock', badge: 'bg-motriks-soft text-motriks-deep ring-green-600/15', bar: 'bg-motriks' },
    warning: { label: 'Stock bas', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', bar: 'bg-amber-500' },
    critical: { label: 'Critique', badge: 'bg-red-50 text-red-700 ring-red-600/20', bar: 'bg-red-500' },
};

const fcfa = (amount: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);

const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

/** Ce qui demande attention d'abord : critique, puis bas, puis le reste par ordre alphabétique. */
const ORDER: Record<StockStatus, number> = { critical: 0, warning: 1, normal: 2 };

function ProductRow({ p }: { p: StockProduct }) {
    const s = STATUS[p.status];
    // Jauge : le seuil d'alerte est au tiers, pour voir d'un coup d'œil la marge restante
    const reference = Math.max(p.alert_threshold * 3, p.stock, 1);
    const pct = Math.min(100, Math.round((p.stock / reference) * 100));

    return (
        <li className="flex items-center gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-5">
            <ProductImage src={p.image_url} alt={p.name} className="size-12" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    {p.status !== 'normal' && (
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', s.badge)}>{s.label}</span>
                    )}
                </div>
                <div className="mt-1.5 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', s.bar)} style={{ width: `${Math.max(pct, p.stock > 0 ? 3 : 0)}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-400 tabular-nums">
                    Alerte à {p.alert_threshold} · {fcfa(p.price)} FCFA l’unité
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className={cn('text-xl font-bold tracking-tight tabular-nums', p.status === 'critical' ? 'text-red-600' : p.status === 'warning' ? 'text-amber-700' : 'text-ink')}>
                    {p.stock}
                </p>
                <p className="text-xs text-slate-400">{p.unit}</p>
            </div>
        </li>
    );
}

/** Stock des points de vente de l'hôtesse, maintenant : en lecture seule. */
export default function TerrainStock({ sites }: { sites: SiteStock[]; currency: string }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const totals = sites.reduce(
        (t, s) => ({
            products: t.products + s.totals.products,
            units: t.units + s.totals.units,
            value: t.value + s.totals.value,
            low: t.low + s.totals.warning + s.totals.critical,
            critical: t.critical + s.totals.critical,
        }),
        { products: 0, units: 0, value: 0, low: 0, critical: 0 },
    );

    const shown = useMemo(() => {
        const q = normalize(search.trim());

        return sites.map((site) => ({
            ...site,
            products: site.products
                .filter((p) => (filter === 'all' || p.status !== 'normal') && (!q || normalize(p.name).includes(q)))
                .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name, 'fr')),
        }));
    }, [sites, search, filter]);

    const nothing = shown.every((s) => s.products.length === 0);

    return (
        <>
            <Head title="Mon stock" />

            <Page title="Mon stock" description="Ce qu’il reste sur votre point de vente, mis à jour à chaque rapport et à chaque réassort.">
                {sites.length === 0 ? (
                    <div className={cn(card, 'p-10 sm:p-16')}>
                        <EmptyState
                            icon={Store}
                            title="Aucun point de vente"
                            description="Votre stock apparaîtra ici dès que votre responsable vous aura affectée à un point de vente."
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <StatStrip
                            items={[
                                { label: 'Produits suivis', value: totals.products, sub: sites.length > 1 ? `${sites.length} points de vente` : (sites[0]?.name ?? '') },
                                { label: 'Unités en stock', value: fcfa(totals.units), sub: 'tous produits' },
                                {
                                    label: 'Valeur du stock',
                                    value: (
                                        <span className="whitespace-nowrap">
                                            {fcfa(totals.value)} <small>FCFA</small>
                                        </span>
                                    ),
                                    sub: 'au prix de vente',
                                },
                                {
                                    label: 'À surveiller',
                                    value: totals.low,
                                    sub: totals.critical > 0 ? `dont ${totals.critical} critique${totals.critical > 1 ? 's' : ''}` : totals.low > 0 ? 'stock bas' : 'tout va bien',
                                },
                            ]}
                        />

                        {totals.critical > 0 && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                                <p>
                                    {totals.critical} produit{totals.critical > 1 ? 's sont' : ' est'} presque épuisé{totals.critical > 1 ? 's' : ''}. Prévenez votre
                                    responsable pour un réassort.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Rechercher un produit"
                                    aria-label="Rechercher un produit"
                                    autoComplete="off"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-10 text-base text-ink outline-none placeholder:text-slate-400 focus:border-motriks focus:ring-2 focus:ring-motriks/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        aria-label="Effacer la recherche"
                                        className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <div role="tablist" aria-label="Filtrer" className="inline-flex w-full gap-1 rounded-2xl bg-slate-100/80 p-1 sm:w-fit">
                                {(
                                    [
                                        ['all', 'Tout le stock', totals.products],
                                        ['low', 'À surveiller', totals.low],
                                    ] as const
                                ).map(([key, label, count]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === key}
                                        onClick={() => setFilter(key)}
                                        className={cn(
                                            'flex h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-all sm:h-8 sm:flex-none',
                                            filter === key ? 'bg-white text-ink shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-ink',
                                        )}
                                    >
                                        {label}
                                        <span className={cn('rounded-full px-1.5 text-xs font-semibold tabular-nums', filter === key ? 'bg-motriks-soft text-motriks-deep' : 'text-slate-400')}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {nothing ? (
                            <div className={cn(card, 'p-12')}>
                                <EmptyState
                                    icon={filter === 'low' && !search ? Package : Search}
                                    title={filter === 'low' && !search ? 'Rien à surveiller' : 'Aucun produit trouvé'}
                                    description={filter === 'low' && !search ? 'Tous vos produits sont au-dessus de leur seuil d’alerte.' : 'Essayez un autre nom de produit.'}
                                />
                            </div>
                        ) : (
                            shown
                                .filter((site) => site.products.length > 0)
                                .map((site) => (
                                    <section key={site.id} className={cn(card, 'overflow-hidden')}>
                                        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                                    <Store className="size-[18px]" />
                                                </span>
                                                <div className="min-w-0">
                                                    <h2 className="truncate text-sm font-semibold text-ink">{site.name}</h2>
                                                    <p className="text-xs text-slate-500">
                                                        {site.city ? `${site.city} · ` : ''}
                                                        {site.totals.products} produit{site.totals.products > 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            {site.updated_at && <p className="text-xs text-slate-400">Mis à jour le {site.updated_at}</p>}
                                        </header>
                                        <ul className="divide-y divide-slate-100">
                                            {site.products.map((p) => (
                                                <ProductRow key={p.id} p={p} />
                                            ))}
                                        </ul>
                                    </section>
                                ))
                        )}
                    </div>
                )}
            </Page>
        </>
    );
}

TerrainStock.layout = {
    breadcrumbs: [{ title: 'Mon stock', href: terrainStock().url }],
};
