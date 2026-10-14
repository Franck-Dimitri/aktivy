import { Head, useForm } from '@inertiajs/react';
import { FileText, Package, Tag } from 'lucide-react';
import { useRef } from 'react';
import { Page, Panel } from '@/components/page/page';
import { index as productsIndex, store as productStore, create as productCreate } from '@/routes/products';
import { dashboard } from '@/routes';

type Props = { units: string[] };

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';
const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function ProductCreate({ units }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        sku: '',
        description: '',
        unit: 'pièce',
        price: '',
        is_active: true as boolean,
        image: null as File | null,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(productStore().url, { forceFormData: true });
    };

    return (
        <>
            <Head title="Nouveau produit" />
            <Page title="Nouveau produit" description="Ajouter un produit au catalogue de l'entreprise.">
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
                                        placeholder="Ex: Eau minérale 1,5L"
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
                                        placeholder="Ex: EAU-1500"
                                        className={`${fieldClass} pl-9 font-mono`}
                                    />
                                </div>
                                {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Unité <span className="text-red-500">*</span></label>
                                <select
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className={fieldClass}
                                    required
                                >
                                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                                {errors.unit && <p className="mt-1 text-xs text-red-600">{errors.unit}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Prix de vente (FCFA)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    placeholder="0"
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
                                        placeholder="Description optionnelle…"
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
                                onChange={(e) => setData('image', e.target.files?.[0] ?? null)}
                            />
                            {data.image ? (
                                <div className="flex items-center gap-4">
                                    <img
                                        src={URL.createObjectURL(data.image)}
                                        alt="Aperçu"
                                        className="size-24 rounded-xl object-cover border border-slate-200"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{data.image.name}</p>
                                        <button
                                            type="button"
                                            onClick={() => setData('image', null)}
                                            className="mt-1 text-xs text-red-500 hover:underline"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            ) : (
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
                            {errors.image && <p className="mt-2 text-xs text-red-600">{errors.image}</p>}
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
                            <p className="mt-1 ml-7 text-xs text-slate-400">Un produit inactif ne peut pas être ajouté à un site.</p>
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
                            {processing ? 'Enregistrement…' : 'Créer le produit'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

ProductCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Produits', href: productsIndex() },
        { title: 'Nouveau', href: productCreate() },
    ],
};
