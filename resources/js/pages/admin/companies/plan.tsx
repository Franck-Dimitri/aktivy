import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check } from 'lucide-react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { Field, TextInput, ToggleField } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { PlanUsageList, type PlanState } from '@/components/plans/plan-usage';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import {
    index as companiesIndex,
    show as companyShow,
} from '@/routes/admin/companies';
import { update as planUpdate } from '@/routes/admin/companies/plan';
import { number } from '@/pages/reports/format';

export type CatalogPlan = {
    key: string;
    label: string;
    short: string;
    price: number;
    audience: string;
    highlights: string[];
    accepts_packs: boolean;
};

type Props = {
    company: { id: number; name: string };
    plan: PlanState;
    plans: CatalogPlan[];
    pack: { price: number; hostesses: number; sites: number };
};

const fcfa = number;

const addMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);

    return d.toISOString().slice(0, 10);
};

const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);

    return d.toISOString().slice(0, 10);
};

export default function AdminCompanyPlan({
    company,
    plan,
    plans,
    pack,
}: Props) {
    const { data, setData, put, processing, errors } = useForm({
        plan: plan.subscribed_key,
        ends_on: plan.ends_on_iso ?? '',
        trial: plan.trial,
        extra_packs: plan.extra_packs,
    });

    const selected = plans.find((p) => p.key === data.plan) ?? plans[0];
    const isStarter = selected.key === 'starter';
    const monthly =
        selected.price +
        (selected.accepts_packs ? data.extra_packs * pack.price : 0);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(planUpdate(company.id).url, {
            preserveScroll: true,
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title={`Forfait · ${company.name}`} />

            <Page
                title={`Forfait de ${company.name}`}
                description={
                    plan.expired
                        ? `${plan.subscribed_label} a pris fin le ${plan.ends_on} : l’entreprise est en Motriks Starter.`
                        : `Actuellement ${plan.label}${plan.trial ? ' (essai)' : ''}${plan.ends_on ? ` jusqu’au ${plan.ends_on}` : ''}.`
                }
                className="max-w-6xl"
                actions={
                    <Link
                        href={companyShow(company.id).url}
                        className={buttonClass('secondary', 'md')}
                    >
                        <ArrowLeft />
                        Fiche de l’entreprise
                    </Link>
                }
            >
                <form
                    onSubmit={submit}
                    className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
                >
                    <div className="flex flex-col gap-6">
                        <div
                            role="radiogroup"
                            aria-label="Forfait"
                            className="grid gap-3 sm:grid-cols-2"
                        >
                            {plans.map((p) => {
                                const active = p.key === data.plan;

                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => {
                                            setData((d) => ({
                                                ...d,
                                                plan: p.key,
                                                trial:
                                                    p.key === 'starter'
                                                        ? false
                                                        : d.trial,
                                                extra_packs: p.accepts_packs
                                                    ? d.extra_packs
                                                    : 0,
                                            }));
                                        }}
                                        className={cn(
                                            'flex flex-col gap-2 rounded-2xl border bg-white p-4 text-left transition-all dark:bg-card',
                                            active
                                                ? 'border-motriks shadow-[0_0_0_3px] shadow-motriks-soft'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-sidebar-border',
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-ink">
                                                {p.label}
                                            </span>
                                            {active && (
                                                <span className="flex size-5 items-center justify-center rounded-full bg-motriks text-white">
                                                    <Check className="size-3.5" />
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-lg font-bold text-ink tabular-nums">
                                            {p.price === 0
                                                ? 'Gratuit'
                                                : `${fcfa.format(p.price)} FCFA`}
                                            {p.price > 0 && (
                                                <span className="text-xs font-medium text-slate-500">
                                                    {' '}
                                                    / mois
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {p.audience}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <Panel title="Durée et options">
                            <div className="flex flex-col gap-5 p-5">
                                {isStarter ? (
                                    <p className="text-sm text-slate-500">
                                        Motriks Starter est gratuit et sans date
                                        de fin. Les packs d’extension ne s’y
                                        ajoutent pas.
                                    </p>
                                ) : (
                                    <>
                                        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                                            <Field
                                                label="Jusqu’au"
                                                htmlFor="ends_on"
                                                hint="vide = sans date de fin"
                                                error={errors.ends_on}
                                            >
                                                <TextInput
                                                    id="ends_on"
                                                    type="date"
                                                    value={data.ends_on}
                                                    onChange={(e) =>
                                                        setData(
                                                            'ends_on',
                                                            e.target.value,
                                                        )
                                                    }
                                                    error={errors.ends_on}
                                                />
                                            </Field>
                                            <div className="flex flex-wrap gap-1.5 pb-1">
                                                {[
                                                    [
                                                        '14 jours',
                                                        () => addDays(14),
                                                    ],
                                                    [
                                                        '1 mois',
                                                        () => addMonths(1),
                                                    ],
                                                    [
                                                        '3 mois',
                                                        () => addMonths(3),
                                                    ],
                                                    [
                                                        '1 an',
                                                        () => addMonths(12),
                                                    ],
                                                    ['Sans fin', () => ''],
                                                ].map(([label, value]) => (
                                                    <button
                                                        key={label as string}
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'ends_on',
                                                                (
                                                                    value as () => string
                                                                )(),
                                                            )
                                                        }
                                                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10"
                                                    >
                                                        {label as string}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <ToggleField
                                            label="Essai gratuit"
                                            description="L’entreprise ne paie pas pendant cette période ; à la date de fin, elle passe en Starter."
                                            checked={data.trial}
                                            onChange={(v) =>
                                                setData('trial', v)
                                            }
                                        />

                                        {selected.accepts_packs && (
                                            <Field
                                                label="Packs d’extension"
                                                htmlFor="extra_packs"
                                                hint={`+${pack.hostesses} hôtesses et +${pack.sites} points de vente chacun, ${fcfa.format(pack.price)} FCFA / mois`}
                                                error={errors.extra_packs}
                                            >
                                                <TextInput
                                                    id="extra_packs"
                                                    type="number"
                                                    min={0}
                                                    max={50}
                                                    value={data.extra_packs}
                                                    onChange={(e) =>
                                                        setData(
                                                            'extra_packs',
                                                            Math.max(
                                                                0,
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ) || 0,
                                                            ),
                                                        )
                                                    }
                                                    error={errors.extra_packs}
                                                    className="max-w-32"
                                                />
                                            </Field>
                                        )}
                                    </>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-sidebar-border">
                                    <p className="text-sm text-slate-600">
                                        {data.trial && !isStarter ? (
                                            <>
                                                Essai gratuit de{' '}
                                                {selected.label}
                                            </>
                                        ) : (
                                            <>
                                                Montant mensuel :{' '}
                                                <strong className="text-ink">
                                                    {monthly === 0
                                                        ? 'gratuit'
                                                        : `${fcfa.format(monthly)} FCFA`}
                                                </strong>
                                            </>
                                        )}
                                    </p>
                                    <ActionButton
                                        type="submit"
                                        loading={processing}
                                    >
                                        Enregistrer le forfait
                                    </ActionButton>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Pour un paiement reçu, utilisez plutôt «
                                    Paiement reçu » sur la fiche : la facture
                                    est créée et le forfait mis en place en même
                                    temps.
                                </p>
                            </div>
                        </Panel>
                    </div>

                    <Panel
                        title="Utilisation actuelle"
                        description={`Limites de ${plan.label}${plan.extra_packs ? `, avec ${plan.extra_packs} pack${plan.extra_packs > 1 ? 's' : ''}` : ''}.`}
                    >
                        <PlanUsageList plan={plan} />
                    </Panel>
                </form>
            </Page>
        </>
    );
}

AdminCompanyPlan.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Entreprises', href: companiesIndex().url },
    ],
};
