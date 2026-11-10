import { useForm } from '@inertiajs/react';
import { Banknote } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import {
    Field,
    SelectInput,
    TextArea,
    TextInput,
} from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import type { PackCatalog } from '@/components/plans/plan-usage';
import { toastFormError } from '@/lib/form-toast';
import { store as paymentStore } from '@/routes/admin/subscriptions/payments';
import { number } from '@/pages/reports/format';

export type Option = { key: string; label: string };
export type PlanOption = {
    key: string;
    label: string;
    price: number;
    accepts_packs: boolean;
    accepts_supervisor_packs: boolean;
};

const fcfa = number;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const addMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);

    return iso(d);
};

/**
 * Enregistrer un paiement reçu (Mobile Money, virement…) : une facture numérotée est créée et
 * le forfait choisi est mis en place jusqu'à la fin de période.
 */
export function RecordPaymentModal({
    company,
    plans,
    methods,
    packs,
    currentPlan,
    currentPacks = 0,
    currentSupervisorPacks = 0,
    onClose,
}: {
    company: { id: number; name: string };
    plans: PlanOption[];
    methods: Option[];
    packs: PackCatalog;
    currentPlan?: string;
    currentPacks?: number;
    currentSupervisorPacks?: number;
    onClose: () => void;
}) {
    const paid = plans.filter((p) => p.key !== 'starter');
    const initialPlan = paid.find((p) => p.key === currentPlan) ?? paid[0];
    const [months, setMonths] = useState(1);

    /** Prix mensuel d'un forfait avec ses packs (ceux que le forfait n'accepte pas ne comptent pas). */
    const perMonth = (p: PlanOption, hostessPacks: number, supervisorPacks: number) =>
        p.price +
        (p.accepts_packs ? hostessPacks * packs.hostesses.price : 0) +
        (p.accepts_supervisor_packs ? supervisorPacks * packs.supervisors.price : 0);

    /** Montant proposé : forfait et packs, multipliés par le nombre de mois (10 mois payés pour 12 à l'année). */
    const suggest = (planKey: string, hostessPacks: number, supervisorPacks: number, periodMonths: number) => {
        const p = paid.find((x) => x.key === planKey) ?? paid[0];

        return String(perMonth(p, hostessPacks, supervisorPacks) * (periodMonths === 12 ? 10 : periodMonths));
    };

    const { data, setData, post, processing, errors } = useForm({
        plan: initialPlan.key,
        extra_packs: currentPacks,
        supervisor_packs: currentSupervisorPacks,
        amount: suggest(initialPlan.key, currentPacks, currentSupervisorPacks, 1),
        method: methods[0]?.key ?? 'orange_money',
        reference: '',
        paid_at: iso(new Date()),
        period_end: addMonths(months),
        notes: '',
    });

    const plan = paid.find((p) => p.key === data.plan) ?? paid[0];
    const monthly = perMonth(plan, data.extra_packs, data.supervisor_packs);

    const packCount = (value: string) => Math.min(50, Math.max(0, Number(value) || 0));

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
            description="Une facture numérotée est créée et le forfait est mis en place jusqu’à la fin de période. Un essai en cours prend fin."
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                    <Field
                        label="Forfait"
                        htmlFor="p-plan"
                        required
                        error={errors.plan}
                    >
                        <SelectInput
                            id="p-plan"
                            value={data.plan}
                            onChange={(e) =>
                                setData((d) => ({
                                    ...d,
                                    plan: e.target.value,
                                    amount: suggest(
                                        e.target.value,
                                        d.extra_packs,
                                        d.supervisor_packs,
                                        months,
                                    ),
                                }))
                            }
                            error={errors.plan}
                        >
                            {paid.map((p) => (
                                <option key={p.key} value={p.key}>
                                    {p.label} · {fcfa.format(p.price)} FCFA /
                                    mois
                                </option>
                            ))}
                        </SelectInput>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label={`Packs hôtesses (+${packs.hostesses.hostesses} / +${packs.hostesses.sites})`}
                            htmlFor="p-packs"
                            hint={`${fcfa.format(packs.hostesses.price)} FCFA / mois chacun`}
                            error={errors.extra_packs}
                        >
                            <TextInput
                                id="p-packs"
                                type="number"
                                min={0}
                                max={50}
                                value={data.extra_packs}
                                onChange={(e) => {
                                    const count = packCount(e.target.value);
                                    setData((d) => ({
                                        ...d,
                                        extra_packs: count,
                                        amount: suggest(d.plan, count, d.supervisor_packs, months),
                                    }));
                                }}
                                error={errors.extra_packs}
                            />
                        </Field>
                        <Field
                            label={`Packs superviseur (+${packs.supervisors.supervisors})`}
                            htmlFor="p-sup-packs"
                            hint={
                                plan.accepts_supervisor_packs
                                    ? `${fcfa.format(packs.supervisors.price)} FCFA / mois chacun`
                                    : 'Superviseurs illimités dans ce forfait'
                            }
                            error={errors.supervisor_packs}
                        >
                            <TextInput
                                id="p-sup-packs"
                                type="number"
                                min={0}
                                max={50}
                                disabled={!plan.accepts_supervisor_packs}
                                value={plan.accepts_supervisor_packs ? data.supervisor_packs : 0}
                                onChange={(e) => {
                                    const count = packCount(e.target.value);
                                    setData((d) => ({
                                        ...d,
                                        supervisor_packs: count,
                                        amount: suggest(d.plan, d.extra_packs, count, months),
                                    }));
                                }}
                                error={errors.supervisor_packs}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <Field
                            label="Jusqu’au"
                            htmlFor="p-end"
                            required
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
                        <div className="flex flex-wrap gap-1.5 pb-1">
                            {(
                                [
                                    ['1 mois', 1],
                                    ['3 mois', 3],
                                    ['1 an (10 mois payés)', 12],
                                ] as const
                            ).map(([label, m]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                        setMonths(m);
                                        setData((d) => ({
                                            ...d,
                                            period_end: addMonths(m),
                                            amount: suggest(
                                                d.plan,
                                                d.extra_packs,
                                                d.supervisor_packs,
                                                m,
                                            ),
                                        }));
                                    }}
                                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Montant reçu (FCFA)"
                            htmlFor="p-amount"
                            required
                            hint={`${fcfa.format(monthly)} FCFA / mois`}
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
