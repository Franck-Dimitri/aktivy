import { Head, useForm } from '@inertiajs/react';
import { Archive, FileText, ImagePlus, Package, Pencil, Plus, RefreshCw, Search, Store, Tag, Trash2, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Field, SelectInput, TextArea, TextInput, ToggleField } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    index as productsIndex,
    create as productCreate,
    update as productUpdate,
    destroy as productDestroy,
} from '@/routes/products';
import type { ProductListItem, ProductStats } from '@/types';

type Props = {
    products: ProductListItem[];
    stats: ProductStats;
    /** Optionnel : si le contrôleur l'envoie, il remplace la liste de secours ci-dessous. */
    units?: string[];
};

type Filter = 'all' | 'active' | 'inactive';

/* Même liste que ProductController::UNITS (utilisée si `units` n'est pas fourni à la liste). */
const FALLBACK_UNITS = ['pièce', 'carton', 'kg', 'g', 'litre', 'ml', 'sachet', 'boîte', 'palette'];

const iconBtn =
    'flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none';

/* ───────────────────────── Carte produit ───────────────────────── */

function ProductCard({ product, onEdit, onDelete }: { product: ProductListItem; onEdit: () => void; onDelete: () => void }) {
    return (
        <GlowCard className="h-full" contentClassName="flex h-full flex-col">
            {/* Zone cliquable : ouvre la fenêtre de modification */}
            <button
                type="button"
                onClick={onEdit}
                className="flex flex-1 cursor-pointer flex-col text-left focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none focus-visible:ring-inset"
            >
                {/* Image : jamais rognée. Les marges blanches des photos se fondent dans le fond (mix-blend-multiply). */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            loading="lazy"
                            className={cn(
                                'h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.04]',
                                !product.is_active && 'grayscale',
                            )}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-200/70 transition-colors group-hover:text-aktivy">
                                <Package className="size-7" strokeWidth={1.5} />
                            </div>
                        </div>
                    )}

                    {!product.is_active && (
                        <div className="absolute top-3 left-3">
                            <StatusBadge tone="neutral">Inactif</StatusBadge>
                        </div>
                    )}
                </div>

                <div className="flex w-full flex-1 flex-col gap-3 border-t border-slate-100 p-5">
                    <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-aktivy-deep">
                            {product.name}
                        </h3>
                        {product.sku && <p className="mt-0.5 truncate font-mono text-xs text-slate-400">{product.sku}</p>}
                    </div>

                    {product.description && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{product.description}</p>
                    )}

                    <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                        {product.price ? (
                            <p className="text-lg font-semibold tracking-tight text-ink tabular-nums">
                                {Number(product.price).toLocaleString('fr-FR')}{' '}
                                <span className="text-xs font-medium text-slate-400">FCFA</span>
                            </p>
                        ) : (
                            <p className="text-sm text-slate-400">Prix non défini</p>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{product.unit}</span>
                    </div>
                </div>
            </button>

            {/* Pied de carte : déploiement + actions */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 pr-3 pl-5">
                <span
                    className={cn(
                        'flex min-w-0 items-center gap-2 text-xs',
                        product.sites_count > 0 ? 'font-medium text-aktivy-deep' : 'text-slate-400',
                    )}
                >
                    {product.sites_count > 0 ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-aktivy" />
                    ) : (
                        <Store className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                        {product.sites_count > 0
                            ? `Sur ${product.sites_count} site${product.sites_count > 1 ? 's' : ''}`
                            : 'Pas encore déployé'}
                    </span>
                </span>

                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        onClick={onEdit}
                        title="Modifier"
                        aria-label={`Modifier ${product.name}`}
                        className={cn(iconBtn, 'hover:bg-green-50 hover:text-aktivy-deep')}
                    >
                        <Pencil className="size-[18px]" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        title="Archiver"
                        aria-label={`Archiver ${product.name}`}
                        className={cn(iconBtn, 'hover:bg-red-50 hover:text-red-600')}
                    >
                        <Trash2 className="size-[18px]" />
                    </button>
                </div>
            </div>
        </GlowCard>
    );
}

/* ───────────────────── Champ photo (fenêtre) ───────────────────── */

const MAX_IMAGE_MB = 3;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const photoBtn =
    'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none';

type PhotoFieldProps = {
    file: File | null;
    currentUrl: string | null;
    removed: boolean;
    onChange: (file: File | null) => void;
    onRemoveCurrent: () => void;
    onRestore: () => void;
    error?: string;
};

function PhotoField({ file, currentUrl, removed, onChange, onRemoveCurrent, onRestore, error }: PhotoFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const src = preview ?? (removed ? null : currentUrl);

    const pick = (f: File | undefined) => {
        if (!f) return;
        if (!ACCEPTED_TYPES.includes(f.type)) {
            setLocalError('Format non pris en charge (JPG, PNG ou WebP).');
            return;
        }
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
            setLocalError(`L'image dépasse ${MAX_IMAGE_MB} Mo.`);
            return;
        }
        setLocalError(null);
        onChange(f);
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
    };

    const message = localError ?? error;

    return (
        <div className="flex flex-col gap-3">
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />

            {src ? (
                <>
                    {/* Aperçu : image entière, jamais rognée ; les marges blanches se fondent dans le fond. */}
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200/70">
                        <img src={src} alt="Aperçu du produit" className="size-full object-contain p-4 mix-blend-multiply" />
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={() => inputRef.current?.click()} className={cn(photoBtn, 'hover:bg-slate-50')}>
                            <RefreshCw className="size-4" />
                            Changer
                        </button>
                        {file ? (
                            <button type="button" onClick={() => onChange(null)} className={cn(photoBtn, 'hover:bg-slate-50')}>
                                <Undo2 className="size-4" />
                                Annuler
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onRemoveCurrent}
                                className={cn(photoBtn, 'hover:border-red-200 hover:bg-red-50 hover:text-red-600')}
                            >
                                <Trash2 className="size-4" />
                                Retirer
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            'flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                            dragging
                                ? 'border-aktivy bg-green-50'
                                : 'border-slate-200 bg-slate-50/60 hover:border-green-400 hover:bg-green-50/50',
                        )}
                    >
                        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-aktivy shadow-sm ring-1 ring-slate-200/70">
                            <ImagePlus className="size-5" />
                        </span>
                        <span>
                            <span className="block text-sm font-medium text-ink">Ajouter une photo</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                                Glissez-la ici ou cliquez · JPG, PNG, WebP · {MAX_IMAGE_MB} Mo max
                            </span>
                        </span>
                    </button>

                    {removed && (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <span>La photo actuelle sera supprimée à l'enregistrement.</span>
                            <button
                                type="button"
                                onClick={onRestore}
                                className="shrink-0 font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                            >
                                Annuler
                            </button>
                        </div>
                    )}
                </>
            )}

            {message && <p className="text-xs font-medium text-red-600">{message}</p>}
        </div>
    );
}

/* ───────────────────── Fenêtre de modification ───────────────────── */

type EditDialogProps = {
    product: ProductListItem;
    units: string[];
    onClose: () => void;
};

function EditProductDialog({ product, units, onClose }: EditDialogProps) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: product.name,
        sku: product.sku ?? '',
        description: product.description ?? '',
        unit: product.unit,
        price: product.price ?? '',
        is_active: product.is_active,
        image: null as File | null,
        remove_image: false,
    });

    // Pas de fermeture accidentelle pendant l'enregistrement.
    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const unitOptions = units.includes(product.unit) ? units : [product.unit, ...units];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(productUpdate({ product: product.id }).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Produit mis à jour', { description: `Les modifications de « ${data.name} » sont enregistrées.` });
                onClose();
            },
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={close} title="Modifier le produit" description={product.name} size="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid flex-1 gap-8 overflow-y-auto px-6 pt-4 pb-6 md:grid-cols-5">
                    {/* Champs */}
                    <div className="grid content-start gap-5 md:col-span-3">
                        <Field label="Nom" htmlFor="edit-name" required error={errors.name}>
                            <TextInput
                                id="edit-name"
                                icon={Package}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                required
                            />
                        </Field>

                        <Field label="Description" htmlFor="edit-description" hint="(optionnel)" error={errors.description}>
                            <TextArea
                                id="edit-description"
                                icon={FileText}
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                error={errors.description}
                            />
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Prix de vente" htmlFor="edit-price" hint="(optionnel)" error={errors.price}>
                                <TextInput
                                    id="edit-price"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    error={errors.price}
                                    trailing={<span className="text-xs font-semibold text-slate-400">FCFA</span>}
                                />
                            </Field>

                            <Field label="Unité" htmlFor="edit-unit" required error={errors.unit}>
                                <SelectInput
                                    id="edit-unit"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    error={errors.unit}
                                    required
                                >
                                    {unitOptions.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>

                        <Field label="Code SKU" htmlFor="edit-sku" hint="(optionnel)" error={errors.sku}>
                            <TextInput
                                id="edit-sku"
                                icon={Tag}
                                value={data.sku}
                                onChange={(e) => setData('sku', e.target.value)}
                                error={errors.sku}
                                className="font-mono"
                            />
                        </Field>
                    </div>

                    {/* Photo + statut */}
                    <div className="flex flex-col gap-6 md:col-span-2">
                        <div>
                            <p className="mb-2 text-sm font-medium text-ink">Photo</p>
                            <PhotoField
                                file={data.image}
                                currentUrl={product.image_url}
                                removed={data.remove_image}
                                onChange={(f) => setData((prev) => ({ ...prev, image: f, remove_image: false }))}
                                onRemoveCurrent={() => setData('remove_image', true)}
                                onRestore={() => setData('remove_image', false)}
                                error={errors.image}
                            />
                        </div>

                        <ToggleField
                            checked={data.is_active}
                            onChange={(v) => setData('is_active', v)}
                            label="Produit actif"
                            description="Un produit inactif ne peut pas être ajouté à un site."
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Enregistrer'}
                    </ActionButton>
                </div>
            </form>
        </Modal>
    );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function ProductsIndex({ products, stats, units }: Props) {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');

    // Fenêtre de modification : montée uniquement quand elle est visible (le formulaire repart de zéro à chaque ouverture).
    const [editing, setEditing] = useState<ProductListItem | null>(null);
    const openEdit = (p: ProductListItem) => setEditing(p);
    const closeEdit = useCallback(() => setEditing(null), []);

    const { ask, dialog } = useDeleteDialog<ProductListItem>({
        getUrl: (p) => productDestroy({ product: p.id }).url,
        getTitle: (p) => `Archiver « ${p.name} » ?`,
        getDescription: () => 'Le produit sera retiré du catalogue. Vous pourrez toujours retrouver son historique.',
        getSuccessMessage: (p) => `« ${p.name} » a été archivé.`,
        confirmLabel: 'Archiver',
        icon: Archive,
    });

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        return products.filter((p) => {
            if (filter === 'active' && !p.is_active) return false;
            if (filter === 'inactive' && p.is_active) return false;
            if (q && !(p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))) return false;
            return true;
        });
    }, [products, filter, query]);

    const hasFilters = filter !== 'all' || query.trim() !== '';

    const resetFilters = () => {
        setFilter('all');
        setQuery('');
    };

    const filters: { value: Filter; label: string; count: number }[] = [
        { value: 'all', label: 'Tous', count: stats.total },
        { value: 'active', label: 'Actifs', count: stats.active },
        { value: 'inactive', label: 'Inactifs', count: stats.inactive },
    ];

    return (
        <>
            <Head title="Produits" />
            <GlowStyles />

            <Page
                title="Produits"
                description="Catalogue des produits de votre entreprise."
                actions={
                    <ActionLink href={productCreate().url} icon={<Plus />}>
                        Nouveau produit
                    </ActionLink>
                }
            >
                {products.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Package}
                            title="Aucun produit"
                            description="Ajoutez vos produits pour les gérer sur vos points de vente."
                            action={
                                <ActionLink href={productCreate().url} icon={<Plus />}>
                                    Créer le premier produit
                                </ActionLink>
                            }
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                { label: 'Total', value: stats.total },
                                { label: 'Actifs', value: stats.active },
                                { label: 'Inactifs', value: stats.inactive },
                                { label: 'Déployés', value: stats.deployed, live: stats.deployed > 0 },
                            ]}
                        />

                        {/* Recherche + filtre de statut */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="w-full sm:max-w-sm">
                                <TextInput
                                    icon={Search}
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Rechercher un nom ou un code SKU"
                                    aria-label="Rechercher un produit"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                    >
                                        <X className="size-3.5" />
                                        Réinitialiser
                                    </button>
                                )}

                                <div role="group" aria-label="Filtrer par statut" className="inline-flex rounded-xl bg-slate-100 p-1">
                                    {filters.map((f) => {
                                        const active = filter === f.value;

                                        return (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onClick={() => setFilter(f.value)}
                                                aria-pressed={active}
                                                className={cn(
                                                    'inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none',
                                                    active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                                )}
                                            >
                                                {f.label}
                                                <span className={cn('tabular-nums', active ? 'text-aktivy-deep' : 'text-slate-400')}>{f.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <Panel>
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description="Aucun produit ne correspond à votre recherche ou à ce filtre."
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    }
                                />
                            </Panel>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filtered.map((p) => (
                                    <ProductCard key={p.id} product={p} onEdit={() => openEdit(p)} onDelete={() => ask(p)} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Page>

            {editing && (
                <EditProductDialog key={editing.id} product={editing} units={units ?? FALLBACK_UNITS} onClose={closeEdit} />
            )}

            {dialog}
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Produits', href: productsIndex() },
    ],
};