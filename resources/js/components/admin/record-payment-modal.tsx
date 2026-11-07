import { useForm } from '@inertiajs/react';
import { Banknote } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import {
    Field,
    SelectInput,
    TextArea,
    TextInput,
} from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { store as paymentStore } from '@/routes/admin/subscriptions/payments';

export type Option = { key: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

const addMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);

    return iso(d);
};

/**
 * Enregistrer un paiement reçu (Mobile Money, virement…) : il produit une facture et prolonge
 * les modules cochés jusqu'à la fin de période.
 */
export function RecordPaymentModal({
    company,
    modules,
    methods,
    activeKeys,
    onClose,
}: {
    company: { id: number; name: string };
    modules: Option[];
    methods: Option[];
    activeKeys: string[];
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        amount: '',
        method: methods[0]?.key ?? 'orange_money',
        reference: '',
        paid_at: iso(new Date()),
        period_end: addMonths(1),
        modules: activeKeys.length > 0 ? activeKeys : modules.map((m) => m.key),
        notes: '',
    });

    const toggle = (key: string) =>
        setData(
            'modules',
            data.modules.includes(key)
                ? data.modules.filter((k) => k !== key)
                : [...data.modules, key],
        );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(paymentStore(company.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
            onError: toastFormError,
        });
    };

    return (
        <Modal
            onClose={onClose}
            size="lg"
            icon={<Banknote />}
            title={`Paiement de ${company.name}`}
            description="Une facture numérotée est créée. Les modules cochés sont prolongés jusqu’à la fin de période et sortent de l’essai."
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Montant reçu (FCFA)"
                            htmlFor="p-amount"
                            required
                            error={errors.amount}
                        >
                            <TextInput
                                id="p-amount"
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={data.amount}
                                onChange={(e) =>
                                    setData('amount', e.target.value)
                                }
                                error={errors.amount}
                                autoFocus
                            />
                        </Field>
                        <Field
                            label="Moyen de paiement"
                            htmlFor="p-method"
                            required
                            error={errors.method}
                        >
                            <SelectInput
                                id="p-method"
                                value={data.method}
                                onChange={(e) =>
                                    setData('method', e.target.value)
                                }
                                error={errors.method}
                            >
                                {methods.map((m) => (
                                    <option key={m.key} value={m.key}>
                                        {m.label}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field
                            label="Référence"
                            htmlFor="p-ref"
                            hint="n° de transaction"
                            error={errors.reference}
                        >
                            <TextInput
                                id="p-ref"
                                value={data.reference}
                                onChange={(e) =>
                                    setData('reference', e.target.value)
                                }
                                error={errors.reference}
                            />
                        </Field>
                        <Field
                            label="Reçu le"
                            htmlFor="p-date"
                            required
                            error={errors.paid_at}
                        >
                            <TextInput
                                id="p-date"
                                type="date"
                                value={data.paid_at}
                                onChange={(e) =>
                                    setData('paid_at', e.target.value)
                                }
                                error={errors.paid_at}
                            />
                        </Field>
                    </div>

                    <Field label="Modules prolongés" error={errors.modules}>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {modules.map((m) => (
                                <label
                                    key={m.key}
                                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50 dark:border-sidebar-border"
                                >
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-[var(--color-motriks)]"
                                        checked={data.modules.includes(m.key)}
                                        onChange={() => toggle(m.key)}
                                    />
                                    {m.label}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Prolongés jusqu’au"
                            htmlFor="p-end"
                            required={data.modules.length > 0}
                            error={errors.period_end}
                        >
                            <TextInput
                                id="p-end"
                                type="date"
                                value={data.period_end}
                                onChange={(e) =>
                                    setData('period_end', e.target.value)
                                }
                                error={errors.period_end}
                            />
                        </Field>
                        <div className="flex flex-wrap items-end gap-1.5 pb-1">
                            {[
                                ['1 mois', 1],
                                ['3 mois', 3],
                                ['1 an', 12],
                            ].map(([label, months]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() =>
                                        setData(
                                            'period_end',
                                            addMonths(Number(months)),
                                        )
                                    }
                                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Field
                        label="Note"
                        htmlFor="p-notes"
                        hint="facultatif, figure sur la facture"
                        error={errors.notes}
                    >
                        <TextArea
                            id="p-notes"
                            rows={2}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            error={errors.notes}
                        />
                    </Field>
                </div>
                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-sidebar-border dark:bg-white/[0.02]">
                    <ActionButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Annuler
                    </ActionButton>
                    <ActionButton
                        type="submit"
                        loading={processing}
                        icon={<Banknote />}
                    >
                        Enregistrer le paiement
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
