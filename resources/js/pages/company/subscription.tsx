import { Head, Link } from '@inertiajs/react';
import { Check, Download, Mail, Sparkles } from 'lucide-react';
import { buttonClass } from '@/components/page/buttons';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { PlanUsageList, type PlanState } from '@/components/plans/plan-usage';
import { cn } from '@/lib/utils';
import { contact } from '@/routes';
import { subscription as companySubscription } from '@/routes/company';
import { show as invoiceShow } from '@/routes/company/invoices';
import { number } from '@/pages/reports/format';

type CatalogPlan = {
    key: string;
    label: string;
    short: string;
    price: number;
    audience: string;
    highlights: string[];
    limits: Record<string, number | null>;
};

type Payment = {
    id: number;
    invoice_number: string;
    amount: number;
    currency: string;
    method: string;
    plan: string | null;
    paid_at: string;
    period_end: string | null;
};

type Props = {
    plan: PlanState;
    plans: CatalogPlan[];
    pack: { price: number; hostesses: number; sites: number };
    payments?: Payment[];
};

const fcfa = number;

const limitText = (value: number | null, unit: string) =>
    value === null ? `${unit} illimités` : `${value} ${unit}`;

/** Abonnement de l'entreprise : forfait en cours, ce qui est utilisé, et les forfaits Motriks. */
export default function CompanySubscription({
    plan,
    plans,
    pack,
    payments = [],
}: Props) {
    const status = plan.expired ? (
        <StatusBadge tone="warning">
            {plan.subscribed_label} terminé
        </StatusBadge>
    ) : plan.trial ? (
        <StatusBadge tone="info">
            Essai
            {plan.days_left !== null ? ` · ${plan.days_left} j restants` : ''}
        </StatusBadge>
    ) : plan.key === 'starter' ? (
        <StatusBadge tone="neutral">Gratuit</StatusBadge>
    ) : plan.days_left !== null && plan.days_left <= 30 ? (
        <StatusBadge tone="warning">Fin le {plan.ends_on}</StatusBadge>
    ) : (
        <StatusBadge tone="success">
            {plan.ends_on ? `Actif jusqu’au ${plan.ends_on}` : 'Actif'}
        </StatusBadge>
    );

    return (
        <>
            <Head title="Abonnement" />

            <Page
                title="Abonnement"
                description="Votre forfait Motriks, ce que vous utilisez, et les forfaits disponibles."
            >
                <div className="flex flex-col gap-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <Panel>
                            <div className="flex flex-col gap-4 p-5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                                        <Sparkles className="size-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                            Votre forfait
                                        </p>
                                        <h2 className="text-xl font-bold text-ink">
                                            {plan.label}
                                        </h2>
                                    </div>
                                    <div className="ml-auto">{status}</div>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {plan.expired
                                        ? `Votre forfait ${plan.subscribed_label} a pris fin le ${plan.ends_on}. Votre entreprise est passée en Motriks Starter : vos données sont conservées.`
                                        : plan.key === 'starter'
                                          ? 'Motriks Starter est gratuit pour toujours, dans ses limites. Passez à un forfait supérieur pour suivre vos stocks, recevoir des rappels automatiques et remettre des documents à votre nom.'
                                          : plan.trial
                                            ? `Vous essayez ${plan.label} gratuitement${plan.ends_on ? ` jusqu’au ${plan.ends_on}` : ''}. Ensuite, votre entreprise passe en Motriks Starter, sauf si vous choisissez un forfait.`
                                            : `${fcfa.format(plan.monthly_price)} FCFA par mois${plan.extra_packs ? `, dont ${plan.extra_packs} pack${plan.extra_packs > 1 ? 's' : ''} +${pack.hostesses} hôtesses / +${pack.sites} points de vente` : ''}.`}
                                </p>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                    <p className="text-sm text-slate-500">
                                        Pour changer de forfait, ajouter un pack
                                        ou renouveler, contactez-nous.
                                    </p>
                                    <Link
                                        href={contact().url}
                                        className={buttonClass(
                                            'secondary',
                                            'sm',
                                        )}
                                    >
                                        <Mail />
                                        Nous contacter
                                    </Link>
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Ce que vous utilisez">
                            <PlanUsageList plan={plan} />
                        </Panel>
                    </div>

                    <section>
                        <h2 className="mb-3 text-[15px] font-semibold text-ink">
                            Les forfaits Motriks
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {plans.map((p) => {
                                const current = p.key === plan.key;

                                return (
                                    <div
                                        key={p.key}
                                        className={cn(
                                            'flex flex-col gap-3 rounded-2xl border bg-white p-5 dark:bg-card',
                                            current
                                                ? 'border-motriks shadow-[0_0_0_3px] shadow-motriks-soft'
                                                : 'border-slate-200 dark:border-sidebar-border',
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-ink">
                                                {p.label}
                                            </p>
                                            {current && (
                                                <StatusBadge tone="success">
                                                    Le vôtre
                                                </StatusBadge>
                                            )}
                                        </div>
                                        <p className="text-2xl font-bold text-ink tabular-nums">
                                            {p.price === 0
                                                ? 'Gratuit'
                                                : fcfa.format(p.price)}
                                            {p.price > 0 && (
                                                <span className="text-xs font-medium text-slate-500">
                                                    {' '}
                                                    FCFA / mois
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {p.audience}
                                        </p>
                                        <p className="text-xs font-semibold text-slate-700">
                                            {limitText(
                                                p.limits.hostesses,
                                                'hôtesses',
                                            )}{' '}
                                            ·{' '}
                                            {limitText(
                                                p.limits.sites,
                                                'points de vente',
                                            )}
                                        </p>
                                        <ul className="flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                                            {p.highlights.map((h) => (
                                                <li
                                                    key={h}
                                                    className="flex gap-1.5"
                                                >
                                                    <Check className="mt-0.5 size-3.5 shrink-0 text-motriks" />
                                                    {h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            Pack d’extension : +{pack.hostesses} hôtesses et +
                            {pack.sites} points de vente pour{' '}
                            {fcfa.format(pack.price)} FCFA par mois, à partir de
                            Motriks Pro. Paiement à l’année : 10 mois payés pour
                            12.
                        </p>
                    </section>

                    {payments.length > 0 && (
                        <Panel title="Paiements et factures">
                            <ul className="divide-y divide-slate-100">
                                {payments.map((p) => (
                                    <li
                                        key={p.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-ink">
                                                {fcfa.format(p.amount)}{' '}
                                                {p.currency === 'XAF'
                                                    ? 'FCFA'
                                                    : p.currency}
                                                {p.plan && (
                                                    <span className="font-normal text-slate-500">
                                                        {' '}
                                                        · {p.plan}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Facture {p.invoice_number} ·{' '}
                                                {p.method} · payée le{' '}
                                                {p.paid_at}
                                                {p.period_end
                                                    ? ` · jusqu’au ${p.period_end}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <a
                                            href={invoiceShow(p.id).url}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-motriks-deep hover:underline"
                                        >
                                            <Download className="size-3.5" />
                                            Télécharger la facture
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}
                </div>
            </Page>
        </>
    );
}

CompanySubscription.layout = {
    breadcrumbs: [{ title: 'Abonnement', href: companySubscription().url }],
};
