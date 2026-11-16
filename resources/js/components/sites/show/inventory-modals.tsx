import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { type InventoryItem } from '@/components/sites/site-inventory';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import {
    store as inventoryStore,
    update as inventoryUpdate,
    restock as inventoryRestock,
} from '@/routes/sites/inventory';
import { type ProductOption } from '@/components/sites/show/types';
import { ModalFooter } from '@/components/sites/show/ui';

/* -------------------------------------------------------------------------- */
/*  Modals (formulaires)                                                      */
/* -------------------------------------------------------------------------- */

export function InventoryAddModal({
    siteUuid,
    products,
    onClose,
}: {
    siteUuid: string;
    products: ProductOption[];
    onClose: () => void;
}) {
    const [productId, setProductId] = useState('');
    const [currentStock, setCurrentStock] = useState('0');
    const [alertThreshold, setAlertThreshold] = useState('10');
    const [criticalThreshold, setCriticalThreshold] = useState('5');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            inventoryStore({ site: siteUuid }).url,
            {
                product_id: Number(productId),
                current_stock: Number(currentStock),
                alert_threshold: Number(alertThreshold),
                critical_threshold: Number(criticalThreshold),
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success("Produit ajouté à l'inventaire");
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal
            onClose={() => !saving && onClose()}
            title="Ajouter un produit"
            description="Suivez le stock et recevez des alertes."
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field label="Produit" htmlFor="inv_product" required>
                        <SelectInput
                            id="inv_product"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            required
                        >
                            <option value="">Choisir un produit…</option>
                            {products.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label} · {p.unit}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>

                    <Field label="Stock actuel" htmlFor="inv_stock">
                        <TextInput
                            id="inv_stock"
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={(e) => setCurrentStock(e.target.value)}
                            required
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Seuil d'alerte"
                            htmlFor="inv_alert"
                            hint="en dessous : orange"
                        >
                            <TextInput
                                id="inv_alert"
                                type="number"
                                min="0"
                                value={alertThreshold}
                                onChange={(e) =>
                                    setAlertThreshold(e.target.value)
                                }
                                required
                            />
                        </Field>
                        <Field
                            label="Seuil critique"
                            htmlFor="inv_critical"
                            hint="en dessous : rouge"
                        >
                            <TextInput
                                id="inv_critical"
                                type="number"
                                min="0"
                                value={criticalThreshold}
                                onChange={(e) =>
                                    setCriticalThreshold(e.target.value)
                                }
                                required
                            />
                        </Field>
                    </div>
                </div>
                <ModalFooter
                    onCancel={onClose}
                    saving={saving}
                    submitLabel="Ajouter"
                    savingLabel="Ajout…"
                    disabled={!productId}
                />
            </form>
        </Modal>
    );
}

export function StockModal({
    siteUuid,
    item,
    onClose,
}: {
    siteUuid: string;
    item: InventoryItem;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(String(item.current_stock));
    const [alert, setAlert] = useState(String(item.alert_threshold));
    const [critical, setCritical] = useState(String(item.critical_threshold));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.put(
            inventoryUpdate({ site: siteUuid, inventory: item.uuid }).url,
            {
                current_stock: Number(current),
                alert_threshold: Number(alert),
                critical_threshold: Number(critical),
                notes: notes || null,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Stock mis à jour', {
                        description: item.product_name,
                    });
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal
            onClose={() => !saving && onClose()}
            title="Inventaire et seuils"
            description={`${item.product_name} · pour une livraison, utilisez plutôt « Réassort ».`}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field
                        label={`Stock compté (${item.product_unit})`}
                        htmlFor="stk_current"
                        hint="l'écart avec le stock actuel est inscrit dans le journal"
                    >
                        <TextInput
                            id="stk_current"
                            type="number"
                            min="0"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            required
                            autoFocus
                        />
                    </Field>
                    {Number(current) !== item.current_stock && (
                        <Field label="Motif de l'écart" htmlFor="stk_notes">
                            <TextInput
                                id="stk_notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                maxLength={500}
                                placeholder="Ex. inventaire mensuel, casse, vol…"
                            />
                        </Field>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Seuil d'alerte"
                            htmlFor="stk_alert"
                            hint="en dessous : orange"
                        >
                            <TextInput
                                id="stk_alert"
                                type="number"
                                min="0"
                                value={alert}
                                onChange={(e) => setAlert(e.target.value)}
                                required
                            />
                        </Field>
                        <Field
                            label="Seuil critique"
                            htmlFor="stk_critical"
                            hint="en dessous : rouge"
                        >
                            <TextInput
                                id="stk_critical"
                                type="number"
                                min="0"
                                value={critical}
                                onChange={(e) => setCritical(e.target.value)}
                                required
                            />
                        </Field>
                    </div>
                </div>
                <ModalFooter
                    onCancel={onClose}
                    saving={saving}
                    submitLabel="Enregistrer"
                    savingLabel="Enregistrement…"
                />
            </form>
        </Modal>
    );
}

export function RestockModal({
    siteUuid,
    item,
    onClose,
}: {
    siteUuid: string;
    item: InventoryItem;
    onClose: () => void;
}) {
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            inventoryRestock({ site: siteUuid, inventory: item.uuid }).url,
            { quantity: Number(quantity), notes: notes || null },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Réassort enregistré', {
                        description: `${item.product_name} : +${quantity}`,
                    });
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    const after = item.current_stock + (Number(quantity) || 0);

    return (
        <Modal
            onClose={() => !saving && onClose()}
            title="Réassort"
            description={`${item.product_name} · stock actuel ${item.current_stock} ${item.product_unit}`}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field
                        label={`Quantité livrée (${item.product_unit})`}
                        htmlFor="rst_qty"
                        hint={quantity ? `nouveau stock : ${after}` : undefined}
                    >
                        <TextInput
                            id="rst_qty"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                            autoFocus
                        />
                    </Field>
                    <Field label="Note" htmlFor="rst_notes">
                        <TextInput
                            id="rst_notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            maxLength={500}
                            placeholder="Ex. bon de livraison n° 1245"
                        />
                    </Field>
                </div>
                <ModalFooter
                    onCancel={onClose}
                    saving={saving}
                    submitLabel="Ajouter au stock"
                    savingLabel="Enregistrement…"
                    disabled={!(Number(quantity) > 0)}
                />
            </form>
        </Modal>
    );
}
