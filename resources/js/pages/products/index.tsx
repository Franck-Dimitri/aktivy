import { Head, useForm, usePage } from '@inertiajs/react';
import { Archive, FileText, ImagePlus, MoreHorizontal, Package, Pencil, Plus, RefreshCw, Search, Store, Tag, Trash2, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Field, SelectInput, TextArea, TextInput, ToggleField } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { MetricStrip } from '@/components/page/surface';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    index as productsIndex,
    store as productStore,
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

/* ───────────────────────── Carte produit ───────────────────────── */

function ProductCard({ product, canEdit, onEdit, onDelete }: { product: ProductListItem; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
    const [imageFailed, setImageFailed] = useState(false);
    const deployed = product.sites_count > 0;
    // Toute la carte ouvre la fenêtre de modification ; en consultation (comptable), c'est une simple fiche
    const Body = canEdit ? 'button' : 'div';

    return (
        <article className="group relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5">
            <Body
                {...(canEdit ? { type: 'button' as const, onClick: onEdit, 'aria-label': `Modifier ${product.name}` } : {})}
                className={cn(
                    'flex flex-1 items-center gap-3.5 rounded-t-2xl p-4 text-left focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none focus-visible:ring-inset',
                    canEdit ? 'cursor-pointer pr-12' : 'cursor-default',
                )}
            >
                {/* Vignette : jamais rognée, les marges blanches des photos se fondent dans le fond */}
                <span className={cn('flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200/70', !product.is_active && 'opacity-60')}>
                    {product.image_url && !imageFailed ? (
                        <img
                            src={product.image_url}
                            alt=""
                            loading="lazy"
                            onError={() => setImageFailed(true)}
                            className={cn('size-full object-contain p-1.5 mix-blend-multiply transition-transform duration-300 group-hover:scale-105', !product.is_active && 'grayscale')}
                        />
                    ) : (
                        <Package className="size-6 text-slate-300" strokeWidth={1.5} aria-hidden />
                    )}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-start gap-2">
                        <span className="line-clamp-2 text-[15px] leading-snug font-semibold break-words text-ink transition-colors group-hover:text-motriks-deep">{product.name}</span>
                        {!product.is_active && <StatusBadge tone="neutral">Inactif</StatusBadge>}
                    </span>
                    {product.description && <span className="mt-0.5 block truncate text-[13px] text-slate-500">{product.description}</span>}
                    <span className="mt-1.5 flex items-baseline gap-1.5 tabular-nums">
                        {product.price ? (
                            <>
                                <span className="text-[15px] font-semibold tracking-tight text-ink">{Number(product.price).toLocaleString('fr-FR')}</span>
                                <span className="text-xs text-slate-400">FCFA / {product.unit}</span>
                            </>
                        ) : (
                            <span className="text-[13px] text-slate-400">Prix non défini · {product.unit}</span>
                        )}
                    </span>
                </span>
            </Body>

            {/* Déploiement et référence */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs">
                <span className={cn('flex min-w-0 items-center gap-1.5', deployed ? 'font-medium text-motriks-deep' : 'text-slate-400')}>
                    <Store className="size-3.5 shrink-0" />
                    <span className="truncate">{deployed ? `Sur ${product.sites_count} site${product.sites_count > 1 ? 's' : ''}` : 'Pas encore déployé'}</span>
                </span>
                {product.sku && <span className="truncate font-mono text-[11px] text-slate-400">{product.sku}</span>}
            </div>

            {/* Actions (gérant et superviseur) */}
            {canEdit && (
            <div className="absolute top-3 right-3">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Actions pour ${product.name}`}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none data-[state=open]:bg-slate-100 data-[state=open]:text-ink"
                        >
                            <MoreHorizontal className="size-[18px]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                        <DropdownMenuItem onSelect={onEdit} className="cursor-pointer rounded-lg">
                            <Pencil className="size-4" />
                            Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onDelete} className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600 [&_svg]:text-red-500">
                            <Archive className="size-4" />
                            Archiver
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            )}
        </article>
    );
}

/* ───────────────────── Champ photo (fenêtre) ───────────────────── */

const MAX_IMAGE_MB = 3;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const photoBtn =
    'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none';

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
                            'flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                            dragging
                                ? 'border-motriks bg-green-50'
                                : 'border-slate-200 bg-slate-50/60 hover:border-green-400 hover:bg-green-50/50',
                        )}
                    >
                        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-motriks shadow-sm ring-1 ring-slate-200/70">
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
                                className="shrink-0 font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
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

/* ───────────────────── Fenêtre de création ───────────────────── */

type CreateDialogProps = {
    units: string[];
    onClose: () => void;
};

function CreateProductDialog({ units, onClose }: CreateDialogProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        sku: '',
        description: '',
        unit: units.includes('pièce') ? 'pièce' : (units[0] ?? ''),
        price: '',
        is_active: true as boolean,
        image: null as File | null,
    });

    // Pas de fermeture accidentelle pendant l'enregistrement.
    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(productStore().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Produit créé', { description: `« ${data.name} » a été ajouté au catalogue.` });
                onClose();
            },
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={close} title="Nouveau produit" description="Ajoutez un produit au catalogue de l'entreprise." size="lg" icon={<Plus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid flex-1 gap-8 overflow-y-auto px-6 pt-4 pb-6 md:grid-cols-5">
                    {/* Champs */}
                    <div className="grid content-start gap-5 md:col-span-3">
                        <Field label="Nom" htmlFor="new-name" required error={errors.name}>
                            <TextInput
                                id="new-name"
                                icon={Package}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Ex. : Eau minérale 1,5 L"
                                error={errors.name}
                                required
                                autoFocus
                            />
                        </Field>

                        <Field label="Description" htmlFor="new-description" hint="(optionnel)" error={errors.description}>
                            <TextArea
                                id="new-description"
                                icon={FileText}
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Quelques mots sur le produit…"
                                error={errors.description}
                            />
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Prix de vente" htmlFor="new-price" hint="(optionnel)" error={errors.price}>
                                <TextInput
                                    id="new-price"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    placeholder="0"
                                    error={errors.price}
                                    trailing={<span className="text-xs font-semibold text-motriks/70">FCFA</span>}
                                />
                            </Field>

                            <Field label="Unité" htmlFor="new-unit" required error={errors.unit}>
                                <SelectInput
                                    id="new-unit"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    error={errors.unit}
                                    required
                                >
                                    {units.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>

                        <Field label="Code SKU" htmlFor="new-sku" hint="(optionnel)" error={errors.sku}>
                            <TextInput
                                id="new-sku"
                                icon={Tag}
                                value={data.sku}
                                onChange={(e) => setData('sku', e.target.value)}
                                placeholder="Ex. : EAU-1500"
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
                                currentUrl={null}
                                removed={false}
                                onChange={(f) => setData('image', f)}
                                onRemoveCurrent={() => undefined}
                                onRestore={() => undefined}
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

                <div className="flex items-center justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Créer le produit'}
                    </ActionButton>
                </div>
            </form>
        </Modal>
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
        post(productUpdate({ product: product.uuid }).url, {
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
        <Modal onClose={close} title="Modifier le produit" description={product.name} size="lg" icon={<Pencil />}>
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

                <div className="flex items-center justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
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
    // Gérant et superviseur gèrent le catalogue ; le comptable le consulte (prix, déploiement)
    const canEdit = usePage().props.auth.can.manageTeam;
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');

    // Fenêtre de modification : montée uniquement quand elle est visible (le formulaire repart de zéro à chaque ouverture).
    const [editing, setEditing] = useState<ProductListItem | null>(null);
    const openEdit = (p: ProductListItem) => setEditing(p);
    const closeEdit = useCallback(() => setEditing(null), []);

    // Fenêtre de création (même principe : montée seulement quand elle est visible).
    const [creating, setCreating] = useState(false);
    const closeCreate = useCallback(() => setCreating(false), []);

    // Bouton « nouveau produit » : ouvre la fenêtre de création (pas en consultation).
    const newButton = (label: string) => !canEdit ? undefined : (
        <ActionButton type="button" onClick={() => setCreating(true)}>
            <span className="inline-flex items-center gap-2">
                <Plus className="size-4" />
                {label}
            </span>
        </ActionButton>
    );

    const { ask, dialog } = useDeleteDialog<ProductListItem>({
        getUrl: (p) => productDestroy({ product: p.uuid }).url,
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

            <Page
                title="Produits"
                description="Catalogue des produits de votre entreprise."
                actions={newButton('Nouveau produit')}
            >
                {products.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Package}
                            title="Aucun produit"
                            description={canEdit ? 'Ajoutez vos produits pour les gérer sur vos points de vente.' : 'Le catalogue de l’entreprise apparaîtra ici dès que le gérant y aura ajouté des produits.'}
                            action={newButton('Créer le premier produit')}
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

                            <div className="flex flex-wrap items-center gap-3">
                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
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
                                                    'inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                                    active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                                )}
                                            >
                                                {f.label}
                                                <span className={cn('tabular-nums', active ? 'text-motriks-deep' : 'text-slate-400')}>{f.count}</span>
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
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    }
                                />
                            </Panel>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {filtered.map((p) => (
                                    <ProductCard key={p.id} product={p} canEdit={canEdit} onEdit={() => openEdit(p)} onDelete={() => ask(p)} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Page>

            {editing && (
                <EditProductDialog key={editing.id} product={editing} units={units ?? FALLBACK_UNITS} onClose={closeEdit} />
            )}

            {creating && <CreateProductDialog units={units ?? FALLBACK_UNITS} onClose={closeCreate} />}

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