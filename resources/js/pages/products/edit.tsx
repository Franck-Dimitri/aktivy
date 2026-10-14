import { Head, useForm } from '@inertiajs/react';
import { FileText, Package, Tag, X } from 'lucide-react';
import { useRef } from 'react';
import { Page, Panel } from '@/components/page/page';
import { index as productsIndex, update as productUpdate, edit as productEdit } from '@/routes/products';
import { dashboard } from '@/routes';

type ProductData = {
    id: number;
    name: string;
    sku: string | null;
    description: string | null;
    unit: string;
    price: string | null;
    image_url: string | null;
    is_active: boolean;
};

type Props = { product: ProductData; units: string[] };

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';
const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function ProductEdit({ product, units }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors } = useForm({
        _method:      'PUT',
        name:         product.name,
        sku:          product.sku ?? '',
        description:  product.description ?? '',
        unit:         product.unit,
        price:        product.price ?? '',
        is_active:    product.is_active,
        image:        null as File | null,
        remove_image: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(productUpdate({ product: product.id }).url, { forceFormData: true });
    };

    return (
        <>
            <Head title={`Modifier · ${product.name}`} />
            <Page title="Modifier le produit">
                <form onSubmit={submit} className="flex flex-col gap-6">

                    {/* Identité */}
                    <Panel title="Identité du produit">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Package className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                        required
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Code SKU</label>
                                <div className="relative">
                                    <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={data.sku}
                                        onChange={(e) => setData('sku', e.target.value)}
                                        className={`${fieldClass} pl-9 font-mono`}
                                    />
                                </div>
                                {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Unité <span className="text-red-500">*</span></label>
                                <select value={data.unit} onChange={(e) => setData('unit', e.target.value)} className={fieldClass} required>
                                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Prix de vente (FCFA)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    className={fieldClass}
                                />
                                {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass}>Description</label>
                                <div className="relative">
                                    <FileText className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" />
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15"
                                    />
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* Image */}
                    <Panel title="Photo du produit">
                        <div className="p-5">
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    setData('image', e.target.files?.[0] ?? null);
                                    setData('remove_image', false);
                                }}
                            />

                            {/* Nouvelle image choisie */}
                            {data.image && (
                                <div className="flex items-center gap-4">
                                    <img src={URL.createObjectURL(data.image)} alt="Aperçu" className="size-24 rounded-xl object-cover border border-slate-200" />
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{data.image.name}</p>
                                        <button type="button" onClick={() => setData('image', null)} className="mt-1 text-xs text-red-500 hover:underline">Annuler</button>
                                    </div>
                                </div>
                            )}

                            {/* Image existante */}
                            {!data.image && product.image_url && !data.remove_image && (
                                <div className="flex items-center gap-4">
                                    <img src={product.image_url} alt={product.name} className="size-24 rounded-xl object-cover border border-slate-200" />
                                    <div className="flex flex-col gap-2">
                                        <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-aktivy-deep hover:underline">
                                            Changer l'image
                                        </button>
                                        <button type="button" onClick={() => setData('remove_image', true)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                                            <X className="size-3" /> Supprimer l'image
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Pas d'image */}
                            {!data.image && (!product.image_url || data.remove_image) && (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-8 text-slate-400 hover:border-aktivy hover:text-aktivy transition-colors"
                                >
                                    <Package className="size-8" />
                                    <span className="text-sm font-semibold">Choisir une image</span>
                                    <span className="text-xs">JPG, PNG ou WEBP · max 3 Mo</span>
                                </button>
                            )}
                        </div>
                    </Panel>

                    {/* Statut */}
                    <Panel title="Statut">
                        <div className="p-5">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="size-4 rounded border-slate-300 accent-aktivy"
                                />
                                <span className="text-sm font-semibold text-ink">Produit actif</span>
                            </label>
                        </div>
                    </Panel>

                    <div className="flex items-center justify-end gap-3">
                        <a href={productsIndex().url} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] disabled:opacity-60"
                        >
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

ProductEdit.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Produits', href: productsIndex() },
    ],
};
