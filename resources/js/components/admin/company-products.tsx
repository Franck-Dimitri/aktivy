import { AlertTriangle, Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TextInput } from '@/components/page/form-fields';
import { QuietEmpty } from '@/components/page/list-kit';
import { ProductImage } from '@/components/page/product-image';
import { cn } from '@/lib/utils';
import { number } from '@/pages/reports/format';

/** Produit d'une entreprise vu par l'administration (App\Http\Controllers\Admin\CompanyController::show). */
export type CompanyProduct = {
    id: number;
    name: string;
    unit: string;
    price: number | null;
    description: string | null;
    image_url: string | null;
    active: boolean;
    sites_count: number;
    total_stock: number;
    low_count: number;
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * Catalogue de l'entreprise : photo, prix, présence dans les points de vente et stock cumulé.
 * Consultation seule : le catalogue reste géré par l'entreprise.
 */
export function CompanyProducts({
    products,
    currency,
}: {
    products: CompanyProduct[];
    currency: string;
}) {
    const [query, setQuery] = useState('');

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? products.filter((p) => p.name.toLowerCase().includes(q))
            : products;
    }, [products, query]);

    const totalStock = products.reduce((sum, p) => sum + p.total_stock, 0);
    const low = products.filter((p) => p.low_count > 0).length;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-sidebar-border">
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-ink">
                        Produits
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {plural(products.length, 'produit')} ·{' '}
                        {number.format(totalStock)} unités en stock
                        {low > 0 && (
                            <span className="text-amber-700">
                                {' '}
                                · {plural(low, 'produit')} en stock bas
                            </span>
                        )}
                    </p>
                </div>
                {products.length > 6 && (
                    <div className="sm:w-64">
                        <TextInput
                            icon={Search}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher un produit"
                            aria-label="Rechercher un produit"
                            className="h-9"
                        />
                    </div>
                )}
            </div>

            {products.length === 0 ? (
                <QuietEmpty icon={Package} title="Aucun produit">
                    L’entreprise n’a pas encore créé son catalogue.
                </QuietEmpty>
            ) : shown.length === 0 ? (
                <QuietEmpty icon={Search} title="Aucun produit ne correspond" />
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                    {shown.map((p) => (
                        <li
                            key={p.id}
                            className={cn(
                                'flex items-center gap-4 px-5 py-3',
                                !p.active && 'opacity-60',
                            )}
                        >
                            <ProductImage
                                src={p.image_url}
                                alt={p.name}
                                className="size-12 shrink-0 rounded-xl"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                    <span className="truncate">{p.name}</span>
                                    {!p.active && (
                                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                            Inactif
                                        </span>
                                    )}
                                </p>
                                <p
                                    className="truncate text-xs text-slate-500"
                                    title={p.description ?? undefined}
                                >
                                    {p.description || p.unit}
                                </p>
                            </div>
                            <div className="hidden w-36 shrink-0 text-right text-xs text-slate-500 sm:block">
                                <p className="text-sm font-semibold text-ink tabular-nums">
                                    {number.format(p.total_stock)}{' '}
                                    <span className="text-xs font-normal text-slate-500">
                                        en stock
                                    </span>
                                </p>
                                {p.low_count > 0 ? (
                                    <p className="inline-flex items-center gap-1 font-medium text-amber-700">
                                        <AlertTriangle className="size-3" />
                                        bas sur {plural(p.low_count, 'site')}
                                    </p>
                                ) : (
                                    <p>
                                        {p.sites_count > 0
                                            ? `sur ${plural(p.sites_count, 'site')}`
                                            : 'aucun site'}
                                    </p>
                                )}
                            </div>
                            <div className="w-24 shrink-0 text-right">
                                <p className="text-sm font-semibold text-ink tabular-nums">
                                    {p.price !== null
                                        ? number.format(p.price)
                                        : '—'}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {currency} / {p.unit}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
