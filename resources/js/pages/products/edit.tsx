import { Head, useForm } from '@inertiajs/react';
import { FileText, Package, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { Field, FormActions, SelectInput, TextArea, TextInput, ToggleField } from '@/components/page/form-fields';
import { ImagePicker } from '@/components/page/image-picker';
import { Page, Panel } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes';
import { index as productsIndex, update as productUpdate } from '@/routes/products';

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

export default function ProductEdit({ product, units }: Props) {
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(productUpdate({ product: product.id }).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => toast.success('Produit mis à jour', { description: `Les modifications de « ${data.name} » sont enregistrées.` }),
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title={`Modifier · ${product.name}`} />
            <Page title="Modifier le produit" description={product.name}>
                <form onSubmit={submit} className="flex flex-col gap-8">
                    <div className="grid items-start gap-6 lg:grid-cols-3">
                        {/* Colonne principale */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            <Panel title="Informations">
                                <div className="grid gap-5 p-6">
                                    <Field label="Nom" htmlFor="name" required error={errors.name}>
                                        <TextInput
                                            id="name"
                                            icon={Package}
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            error={errors.name}
                                            required
                                        />
                                    </Field>

                                    <Field label="Description" htmlFor="description" hint="(optionnel)" error={errors.description}>
                                        <TextArea
                                            id="description"
                                            icon={FileText}
                                            rows={4}
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            error={errors.description}
                                        />
                                    </Field>
                                </div>
                            </Panel>

                            <Panel title="Prix et référence">
                                <div className="grid gap-5 p-6 sm:grid-cols-2">
                                    <Field label="Prix de vente" htmlFor="price" hint="(optionnel)" error={errors.price}>
                                        <TextInput
                                            id="price"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={data.price}
                                            onChange={(e) => setData('price', e.target.value)}
                                            error={errors.price}
                                            trailing={<span className="text-xs font-semibold text-slate-400">FCFA</span>}
                                        />
                                    </Field>

                                    <Field label="Unité" htmlFor="unit" required error={errors.unit}>
                                        <SelectInput id="unit" value={data.unit} onChange={(e) => setData('unit', e.target.value)} error={errors.unit} required>
                                            {units.map((u) => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </SelectInput>
                                    </Field>

                                    <Field label="Code SKU" htmlFor="sku" hint="(optionnel)" error={errors.sku} className="sm:col-span-2">
                                        <TextInput
                                            id="sku"
                                            icon={Tag}
                                            value={data.sku}
                                            onChange={(e) => setData('sku', e.target.value)}
                                            error={errors.sku}
                                            className="font-mono"
                                        />
                                    </Field>
                                </div>
                            </Panel>
                        </div>

                        {/* Colonne latérale */}
                        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                            <Panel title="Photo">
                                <div className="p-6">
                                    <ImagePicker
                                        file={data.image}
                                        currentUrl={product.image_url}
                                        removed={data.remove_image}
                                        onChange={(f) => setData((prev) => ({ ...prev, image: f, remove_image: false }))}
                                        onRemoveCurrent={() => setData('remove_image', true)}
                                        onRestore={() => setData('remove_image', false)}
                                        error={errors.image}
                                    />
                                </div>
                            </Panel>

                            <Panel title="Statut">
                                <div className="p-6">
                                    <ToggleField
                                        checked={data.is_active}
                                        onChange={(v) => setData('is_active', v)}
                                        label="Produit actif"
                                        description="Un produit inactif ne peut pas être ajouté à un site."
                                    />
                                </div>
                            </Panel>
                        </div>
                    </div>

                    <FormActions>
                        <ActionLink href={productsIndex().url} variant="secondary">Annuler</ActionLink>
                        <ActionButton type="submit" loading={processing}>
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </ActionButton>
                    </FormActions>
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