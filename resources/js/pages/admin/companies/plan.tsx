import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { TextInput, ToggleField } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import type { PlanState } from '@/components/plans/plan-usage';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { number } from '@/pages/reports/format';
import { dashboard } from '@/routes/admin';
import { index as companiesIndex, show as companyShow } from '@/routes/admin/companies';
import { update as planUpdate } from '@/routes/admin/companies/plan';

export type CatalogPlan = {
    key: string;
    label: string;
    short: string;
    price: number;
    audience: string;
    limits: Record<string, number | null>;
    highlights: string[];
    accepts_packs: boolean;
};

type Props = {
    company: { id: number; name: string };
    plan: PlanState;
    plans: CatalogPlan[];
    pack: { price: number; hostesses: number; sites: number };
};

/** Date du jour décalée, au format AAAA-MM-JJ (champ date). */
const shift = (days: number, months = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() + days);

    return d.toISOString().slice(0, 10);
};

const PRESETS: { label: string; value: () => string }[] = [
    { label: '14 jours', value: () => shift(14) },
    { label: '1 mois', value: () => shift(0, 1) },
    { label: '3 mois', value: () => shift(0, 3) },
    { label: '1 an', value: () => shift(0, 12) },
    { label: 'Sans fin', value: () => '' },
];

const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const USAGE: { key: keyof PlanState['usage']; label: string; packs?: 'hostesses' | 'sites' }[] = [
    { key: 'hostesses', label: 'Hôtesses', packs: 'hostesses' },
    { key: 'sites', label: 'Points de vente', packs: 'sites' },
    { key: 'backoffice', label: 'Utilisateurs du back-office' },
    { key: 'events_per_month', label: 'Événements ce mois-ci' },
];

/** Étape du formulaire : numéro, titre, contenu. */
function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-motriks-soft text-xs font-bold text-motriks-deep">
                    {n}
                </span>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
                    {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
                </div>
            </div>
            <div className="px-5 pt-4 pb-5 sm:px-6">{children}</div>
        </section>
    );
}

/** Forfait d'une entreprise : choix du forfait, durée, essai et packs, avec un récapitulatif avant d'enregistrer. */
export default function AdminCompanyPlan({ company, plan, plans, pack }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        plan: plan.subscribed_key,
        ends_on: plan.ends_on_iso ?? '',
        trial: plan.trial,
        extra_packs: plan.extra_packs,
    });

    const selected = plans.find((p) => p.key === data.plan) ?? plans[0];
    const current = plans.find((p) => p.key === plan.subscribed_key);
    const isStarter = selected.key === 'starter';
    const packs = selected.accepts_packs ? data.extra_packs : 0;
    const monthly = selected.price + packs * pack.price;
    const activePreset = PRESETS.find((p) => p.value() === data.ends_on)?.label;

    const unchanged =
        data.plan === plan.subscribed_key && data.ends_on === (plan.ends_on_iso ?? '') && data.trial === plan.trial && packs === plan.extra_packs;

    // Utilisation actuelle face aux limites du forfait choisi (packs compris)
    const usage = USAGE.map((u) => {
        const base = selected.limits[u.key];
        const limit = base === null || base === undefined ? null : base + (u.packs ? packs * pack[u.packs] : 0);
        const used = plan.usage[u.key];

        return { ...u, used, limit, over: limit !== null && used > limit };
    });
    const overLimits = usage.filter((u) => u.over);

    const choose = (p: CatalogPlan) =>
        setData((d) => ({
            ...d,
            plan: p.key,
            trial: p.key === 'starter' ? false : d.trial,
            ends_on: p.key === 'starter' ? '' : d.ends_on,
            extra_packs: p.accepts_packs ? d.extra_packs : 0,
        }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(planUpdate(company.id).url, { preserveScroll: true, onError: toastFormError });
    };

    const currentText = plan.expired
        ? `${plan.subscribed_label} terminé le ${plan.ends_on} : l’entreprise est en Starter.`
        : `${plan.label}${plan.trial ? ' (essai)' : ''}${plan.ends_on ? ` jusqu’au ${plan.ends_on}` : ''}${
              plan.extra_packs ? ` · ${plan.extra_packs} pack${plan.extra_packs > 1 ? 's' : ''}` : ''
          }`;

    return (
        <>
            <Head title={`Forfait · ${company.name}`} />

            <Page
                title="Changer de forfait"
                description={
                    <>
                        <span className="font-medium text-slate-700">{company.name}</span> · actuellement {currentText}
                    </>
                }
                actions={
                    <Link href={companyShow(company.id).url} className={buttonClass('secondary')}>
                        <ArrowLeft />
                        Retour à la fiche
                    </Link>
                }
            >
                <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="flex min-w-0 flex-col gap-5">
                        {/* 1. Forfait */}
                        <Step n={1} title="Forfait">
                            <div role="radiogroup" aria-label="Forfait" className="flex flex-col gap-2">
                                {plans.map((p) => {
                                    const active = p.key === data.plan;

                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => choose(p)}
                                            className={cn(
                                                'flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-motriks/30 focus-visible:outline-none',
                                                active
                                                    ? 'border-motriks bg-motriks-soft/40 ring-1 ring-motriks'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                                    active ? 'border-motriks bg-motriks text-white' : 'border-slate-300 bg-white',
                                                )}
                                            >
                                                {active && <Check className="size-3" strokeWidth={3} />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-ink">{p.label}</span>
                                                    {p.key === plan.subscribed_key && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                                                            Actuel
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-slate-500">{p.audience}</span>
                                            </span>
                                            <span className="shrink-0 text-right">
                                                <span className="block text-sm font-semibold text-ink tabular-nums">
                                                    {p.price === 0 ? 'Gratuit' : `${number.format(p.price)} FCFA`}
                                                </span>
                                                {p.price > 0 && <span className="block text-[11px] text-slate-400">par mois</span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>

                        {/* 2. Durée */}
                        <Step
                            n={2}
                            title="Durée"
                            hint={isStarter ? 'Motriks Starter est gratuit et sans date de fin.' : 'Jusqu’à quand ce forfait s’applique.'}
                        >
                            {isStarter ? (
                                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Aucune date à choisir.</p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        {PRESETS.map((preset) => {
                                            const active = activePreset === preset.label;

                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => setData('ends_on', preset.value())}
                                                    className={cn(
                                                        'h-9 rounded-lg border px-3.5 text-sm font-medium transition-colors',
                                                        active
                                                            ? 'border-motriks bg-motriks text-white'
                                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                                    )}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                                        <label htmlFor="ends_on" className="text-sm text-slate-500">
                                            ou jusqu’au
                                        </label>
                                        <div className="sm:w-52">
                                            <TextInput
                                                id="ends_on"
                                                type="date"
                                                value={data.ends_on}
                                                onChange={(e) => setData('ends_on', e.target.value)}
                                                error={errors.ends_on}
                                                className="h-10"
                                            />
                                        </div>
                                    </div>
                                    {errors.ends_on && <p className="text-sm text-red-600">{errors.ends_on}</p>}

                                    <ToggleField
                                        label="Essai gratuit"
                                        description="Rien à payer pendant cette période ; à la date de fin, l’entreprise repasse en Starter."
                                        checked={data.trial}
                                        onChange={(v) => setData('trial', v)}
                                    />
                                </div>
                            )}
                        </Step>

                        {/* 3. Packs */}
                        {selected.accepts_packs && (
                            <Step
                                n={3}
                                title="Packs d’extension"
                                hint={`+${pack.hostesses} hôtesses et +${pack.sites} points de vente par pack, ${number.format(pack.price)} FCFA / mois.`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center rounded-xl border border-slate-200">
                                        <button
                                            type="button"
                                            aria-label="Retirer un pack"
                                            disabled={data.extra_packs === 0}
                                            onClick={() => setData('extra_packs', Math.max(0, data.extra_packs - 1))}
                                            className="flex size-10 items-center justify-center rounded-l-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <Minus className="size-4" />
                                        </button>
                                        <span className="w-12 text-center text-base font-semibold text-ink tabular-nums" aria-live="polite">
                                            {data.extra_packs}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Ajouter un pack"
                                            disabled={data.extra_packs >= 50}
                                            onClick={() => setData('extra_packs', Math.min(50, data.extra_packs + 1))}
                                            className="flex size-10 items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <Plus className="size-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {data.extra_packs === 0
                                            ? 'Aucun pack'
                                            : `+${data.extra_packs * pack.hostesses} hôtesses, +${data.extra_packs * pack.sites} points de vente`}
                                    </p>
                                </div>
                                {errors.extra_packs && <p className="mt-2 text-sm text-red-600">{errors.extra_packs}</p>}
                            </Step>
                        )}
                    </div>

                    {/* Récapitulatif, toujours visible sur ordinateur */}
                    <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
                        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                            <div className="border-b border-slate-100 px-5 py-4">
                                <h2 className="text-sm font-semibold text-ink">Récapitulatif</h2>
                                <div className="mt-3 flex items-center gap-2 text-sm">
                                    <span className="truncate text-slate-500">{current?.label.replace('Motriks ', '') ?? plan.subscribed_label}</span>
                                    <ArrowRight className="size-3.5 shrink-0 text-slate-300" />
                                    <span className="truncate font-semibold text-ink">{selected.label.replace('Motriks ', '')}</span>
                                </div>
                            </div>

                            <dl className="flex flex-col gap-2.5 px-5 py-4 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">Durée</dt>
                                    <dd className="text-right text-ink">
                                        {isStarter || !data.ends_on ? 'Sans date de fin' : `Jusqu’au ${longDate(data.ends_on)}`}
                                    </dd>
                                </div>
                                {!isStarter && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-slate-500">Essai gratuit</dt>
                                        <dd className="text-ink">{data.trial ? 'Oui' : 'Non'}</dd>
                                    </div>
                                )}
                                {selected.accepts_packs && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-slate-500">Packs</dt>
                                        <dd className="text-ink tabular-nums">{packs}</dd>
                                    </div>
                                )}
                            </dl>

                            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                                <p className="text-xs text-slate-500">{data.trial && !isStarter ? 'Pendant l’essai' : 'Montant mensuel'}</p>
                                <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink tabular-nums">
                                    {data.trial || monthly === 0 ? 'Gratuit' : number.format(monthly)}
                                    {!data.trial && monthly > 0 && <span className="text-sm font-medium text-slate-500"> FCFA</span>}
                                </p>
                                <ActionButton type="submit" loading={processing} disabled={unchanged} className="mt-4 w-full">
                                    Enregistrer le forfait
                                </ActionButton>
                                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                    Paiement reçu ? Passez plutôt par « Paiement reçu » sur la fiche : la facture est créée et le forfait mis en place
                                    en même temps.
                                </p>
                            </div>
                        </section>

                        {/* Utilisation face aux limites du forfait choisi */}
                        <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-xs">
                            <h2 className="text-sm font-semibold text-ink">Utilisation actuelle</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Comparée aux limites de {selected.label.replace('Motriks ', '')}.</p>
                            <ul className="mt-4 flex flex-col gap-3.5">
                                {usage.map((u) => {
                                    const ratio = u.limit ? Math.min(1, u.used / u.limit) : 0;

                                    return (
                                        <li key={u.key}>
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="text-slate-600">{u.label}</span>
                                                <span className={cn('font-semibold tabular-nums', u.over ? 'text-amber-700' : 'text-ink')}>
                                                    {u.used}
                                                    <span className="font-normal text-slate-400">
                                                        {' / '}
                                                        {u.limit === null ? 'illimité' : u.limit === 0 ? 'non compris' : u.limit}
                                                    </span>
                                                </span>
                                            </div>
                                            {u.limit !== null && u.limit > 0 && (
                                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn('h-full rounded-full', u.over ? 'bg-amber-500' : 'bg-motriks')}
                                                        style={{ width: `${Math.max(ratio * 100, u.used > 0 ? 4 : 0)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                            {overLimits.length > 0 && (
                                <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                    L’entreprise dépasse déjà {overLimits.length > 1 ? 'des limites' : 'une limite'} de ce forfait (
                                    {overLimits.map((u) => u.label.toLowerCase()).join(', ')}). Rien n’est supprimé, mais elle ne pourra plus en
                                    ajouter.
                                </p>
                            )}
                        </section>
                    </aside>
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
