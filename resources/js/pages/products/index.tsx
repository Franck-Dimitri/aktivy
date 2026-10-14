import { Head, Link, router } from '@inertiajs/react';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import {
    index as productsIndex,
    create as productCreate,
    edit as productEdit,
    destroy as productDestroy,
} from '@/routes/products';
import { dashboard } from '@/routes';
import type { ProductListItem, ProductStats } from '@/types';

type Props = {
    products: ProductListItem[];
    stats: ProductStats;
};

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${highlight ? 'border-aktivy/30 bg-aktivy-soft' : 'border-slate-200 bg-white'}`}>
            <p className="text-2xl font-bold text-ink">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        </div>
    );
}

function ProductCard({ product, onDelete }: { product: ProductListItem; onDelete: () => void }) {
    return (
        <div className={`group relative flex flex-col rounded-xl border bg-white shadow-xs transition-shadow hover:shadow-md ${!product.is_active ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className="relative h-40 overflow-hidden rounded-t-xl bg-slate-100">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Package className="size-12 text-slate-300" />
                    </div>
                )}
                {!product.is_active && (
                    <div className="absolute top-2 left-2">
                        <StatusBadge tone="neutral">Inactif</StatusBadge>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
                <div className="flex-1">
                    <p className="font-semibold text-ink leading-tight">{product.name}</p>
                    {product.sku && (
                        <p className="mt-0.5 text-xs text-slate-400 font-mono">{product.sku}</p>
                    )}
                    {product.description && (
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{product.description}</p>
                    )}
                </div>

                {/* Meta */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">{product.unit}</span>
                    {product.price && (
                        <span className="font-semibold text-ink">
                            {Number(product.price).toLocaleString('fr-FR')} FCFA
                        </span>
                    )}
                </div>

                <div className="mt-2 text-xs text-slate-400">
                    {product.sites_count > 0
                        ? `Déployé sur ${product.sites_count} site${product.sites_count > 1 ? 's' : ''}`
                        : 'Pas encore déployé'}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                    <Link
                        href={productEdit({ product: product.id }).url}
                        className="flex flex-1 h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <Pencil className="size-3.5" />
                        Modifier
                    </Link>
                    <button
                        onClick={onDelete}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProductsIndex({ products, stats }: Props) {
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const filtered = filter === 'all'
        ? products
        : products.filter((p) => (filter === 'active' ? p.is_active : !p.is_active));

    const confirmDelete = (p: ProductListItem) => {
        if (confirm(`Archiver « ${p.name} » ? Il sera retiré du catalogue.`)) {
            router.delete(productDestroy({ product: p.id }).url);
        }
    };

    return (
        <>
            <Head title="Produits" />

            <Page
                title="Produits"
                description="Catalogue des produits de votre entreprise."
                actions={
                    <Link
                        href={productCreate().url}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b]"
                    >
                        <Plus className="size-4" />
                        Nouveau produit
                    </Link>
                }
            >
                {products.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Package}
                            title="Aucun produit"
                            description="Ajoutez vos produits pour les gérer sur vos points de vente."
                            action={
                                <Link
                                    href={productCreate().url}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink hover:bg-[#46b52b]"
                                >
                                    <Plus className="size-4" />
                                    Créer le premier produit
                                </Link>
                            }
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <StatCard label="Total"    value={stats.total} />
                            <StatCard label="Actifs"   value={stats.active}   highlight={stats.active > 0} />
                            <StatCard label="Inactifs" value={stats.inactive} />
                            <StatCard label="Déployés" value={stats.deployed} highlight={stats.deployed > 0} />
                        </div>

                        {/* Filtres */}
                        <div className="flex gap-2">
                            {(['all', 'active', 'inactive'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
                                        filter === f
                                            ? 'border-aktivy bg-aktivy-soft text-aktivy-deep'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Inactifs'}
                                </button>
                            ))}
                        </div>

                        {/* Grille */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {filtered.map((p) => (
                                <ProductCard key={p.id} product={p} onDelete={() => confirmDelete(p)} />
                            ))}

                            {/* Ajouter un produit */}
                            <Link
                                href={productCreate().url}
                                className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition-colors hover:border-aktivy hover:text-aktivy"
                            >
                                <Plus className="size-8" />
                                <span className="text-sm font-semibold">Ajouter un produit</span>
                            </Link>
                        </div>
                    </div>
                )}
            </Page>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Produits', href: productsIndex() },
    ],
};
