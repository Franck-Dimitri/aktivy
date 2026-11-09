import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { InvoicePreviewModal, type InvoiceItem } from '@/components/invoices/invoice-preview';
import { ArrowRight, Check, Download, Eye, FileText, PackagePlus } from 'lucide-react';
import { buttonClass } from '@/components/page/buttons';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import type { PlanState } from '@/components/plans/plan-usage';
import { cn } from '@/lib/utils';
import { contact } from '@/routes';
import { subscription as companySubscription } from '@/routes/company';
import { download as invoiceDownload, index as invoicesIndex } from '@/routes/company/invoices';
import { currencyLabel, number } from '@/pages/reports/format';

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
    payments?: (Payment & InvoiceItem)[];
    /** Entreprise facturée (en-tête de l’aperçu). */
    client?: string;
    paymentsCount?: number;
};

const fcfa = number;

const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-xs';

const USAGE: { key: keyof PlanState['usage']; label: string }[] = [
    { key: 'hostesses', label: 'Hôtesses' },
    { key: 'sites', label: 'Points de vente' },
    { key: 'backoffice', label: 'Utilisateurs du back-office' },
    { key: 'events_per_month', label: 'Événements ce mois-ci' },
];

/** Abonnement de l'entreprise : forfait en cours, ce qui est utilisé, et les forfaits Motriks. */
export default function CompanySubscription({ plan, plans, pack, payments = [], paymentsCount = 0, client }: Props) {
    const [preview, setPreview] = useState<InvoiceItem | null>(null);
    const summary = plan.expired
        ? `Votre forfait ${plan.subscribed_label} a pris fin le ${plan.ends_on}. Votre entreprise est passée en Motriks Starter : vos données sont conservées.`
        : plan.key === 'starter'
          ? 'Motriks Starter est gratuit pour toujours, dans ses limites. Passez à un forfait supérieur pour suivre vos stocks, recevoir des rappels automatiques et remettre des documents à votre nom.'
          : plan.trial
            ? `Vous essayez ${plan.label} gratuitement${plan.ends_on ? ` jusqu’au ${plan.ends_on}` : ''}. Ensuite, votre entreprise passe en Motriks Starter, sauf si vous choisissez un forfait.`
            : null;

    const paid = plan.key !== 'starter' && !plan.trial && !plan.expired;
    const soon = !plan.expired && plan.days_left !== null && plan.days_left <= 30;

    return (
        <>
            <Head title="Abonnement" />

            <Page title="Abonnement" description="Votre forfait Motriks, ce que vous utilisez, et les forfaits disponibles.">
                <div className="flex flex-col gap-8">
                    {/* ── Votre forfait : trois informations, une action ── */}
                    <section className={card}>
                        <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                            <div className="px-6 py-5">
                                <p className="text-xs font-medium text-slate-500">Forfait</p>
                                <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink">{plan.label}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {plan.expired
                                        ? `${plan.subscribed_label} terminé`
                                        : plan.trial
                                          ? 'Période d’essai'
                                          : plan.key === 'starter'
                                            ? 'Gratuit'
                                            : 'Actif'}
                                </p>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-xs font-medium text-slate-500">Montant</p>
                                <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink tabular-nums">
                                    {paid ? fcfa.format(plan.monthly_price) : '0'}{' '}
                                    <span className="text-sm font-normal text-slate-500">FCFA / mois</span>
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {plan.extra_packs
                                        ? `Dont ${plan.extra_packs} pack${plan.extra_packs > 1 ? 's' : ''} d’extension`
                                        : paid
                                          ? 'Prix mensuel'
                                          : 'Aucun paiement'}
                                </p>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-xs font-medium text-slate-500">{plan.trial ? 'Fin de l’essai' : 'Échéance'}</p>
                                <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink tabular-nums">{plan.ends_on ?? '—'}</p>
                                <p className={cn('mt-0.5 text-xs', soon ? 'font-medium text-amber-700' : 'text-slate-500')}>
                                    {plan.expired
                                        ? 'Votre entreprise est repassée en Starter'
                                        : plan.days_left !== null
                                          ? `Dans ${plan.days_left} jour${plan.days_left > 1 ? 's' : ''}`
                                          : 'Sans date de fin'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">
                                {summary ?? 'Pour renouveler, changer de forfait ou ajouter un pack, écrivez-nous.'}
                            </p>
                            <div className="flex shrink-0 items-center gap-4">
                                <a href="#forfaits" className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-ink hover:underline">
                                    Comparer les forfaits
                                </a>
                                <Link href={contact().url} className={buttonClass('primary', 'sm')}>
                                    Nous contacter
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* ── Ce que vous utilisez ── */}
                    <section>
                        <h2 className="mb-3 text-[15px] font-semibold text-ink">Ce que vous utilisez</h2>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {USAGE.map(({ key, label }) => {
                                const used = plan.usage[key];
                                const limit = plan.limits[key];
                                const ratio = limit ? Math.min(1, used / limit) : 0;
                                const full = limit !== null && limit > 0 && used >= limit;

                                return (
                                    <div key={key} className={cn(card, 'flex flex-col gap-3 p-4 sm:p-5')}>
                                        <p className="text-xs font-medium text-slate-500">{label}</p>
                                        <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
                                            <span className={full ? 'text-amber-700' : undefined}>{used}</span>
                                            <span className="text-sm font-normal text-slate-400">
                                                {' '}
                                                / {limit === null ? 'illimité' : limit === 0 ? 'non compris' : limit}
                                            </span>
                                        </p>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            {limit !== null && limit > 0 ? (
                                                <div
                                                    className={cn('h-full rounded-full', full ? 'bg-amber-500' : 'bg-motriks')}
                                                    style={{
                                                        width: `${Math.max(ratio * 100, used > 0 ? 4 : 0)}%`,
                                                    }}
                                                />
                                            ) : (
                                                <div className={cn('h-full rounded-full', limit === null ? 'w-full bg-motriks/25' : 'w-0')} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── Les forfaits ── */}
                    <section id="forfaits" className="scroll-mt-6">
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                            <h2 className="text-[15px] font-semibold text-ink">Les forfaits Motriks</h2>
                            <p className="text-xs text-slate-500">Prix par mois · paiement à l’année : 10 mois payés pour 12</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {plans.map((p) => {
                                const current = p.key === plan.key;

                                return (
                                    <div
                                        key={p.key}
                                        className={cn(
                                            'relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow',
                                            current
                                                ? 'border-motriks shadow-[0_0_0_4px_rgba(3,152,85,0.08)]'
                                                : 'border-slate-200/80 shadow-xs hover:shadow-md hover:shadow-slate-900/5',
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-ink">{p.label}</p>
                                            {current && <StatusBadge tone="success">Le vôtre</StatusBadge>}
                                        </div>

                                        <p className="mt-4 flex items-baseline gap-1.5 tabular-nums">
                                            <span className="text-3xl font-bold tracking-tight text-ink">
                                                {p.price === 0 ? 'Gratuit' : fcfa.format(p.price)}
                                            </span>
                                            {p.price > 0 && <span className="text-xs font-medium text-slate-500">FCFA / mois</span>}
                                        </p>
                                        <p className="mt-2 min-h-[3.75rem] text-[13px] leading-relaxed text-slate-500">{p.audience}</p>

                                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                                            <div>
                                                <p className="text-base font-semibold text-ink tabular-nums">{p.limits.hostesses ?? '∞'}</p>
                                                <p className="text-[11px] text-slate-500">hôtesses</p>
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-ink tabular-nums">{p.limits.sites ?? '∞'}</p>
                                                <p className="text-[11px] text-slate-500">points de vente</p>
                                            </div>
                                        </div>

                                        <ul className="mt-5 flex flex-1 flex-col gap-2 text-[13px] text-slate-600">
                                            {p.highlights.map((h) => (
                                                <li key={h} className="flex gap-2">
                                                    <Check className="mt-0.5 size-4 shrink-0 text-motriks" />
                                                    <span>{h}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-6">
                                            {current ? (
                                                <span
                                                    className={cn(
                                                        buttonClass('secondary', 'md'),
                                                        'w-full cursor-default border-motriks/30 bg-motriks-soft text-motriks-deep hover:border-motriks/30 hover:bg-motriks-soft',
                                                    )}
                                                >
                                                    <Check />
                                                    Forfait actuel
                                                </span>
                                            ) : (
                                                <Link href={contact().url} className={cn(buttonClass('secondary', 'md'), 'group w-full')}>
                                                    Choisir {p.short || p.label}
                                                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-5 py-4 text-sm text-slate-600">
                            <PackagePlus className="mt-0.5 size-5 shrink-0 text-motriks-deep" />
                            <p>
                                <span className="font-semibold text-ink">Pack d’extension</span> : +{pack.hostesses} hôtesses et +{pack.sites} points
                                de vente pour <span className="font-semibold text-ink tabular-nums">{fcfa.format(pack.price)} FCFA</span> par mois, à
                                partir de Motriks Pro.
                            </p>
                        </div>
                    </section>

                    {/* ── Dernière facture (toutes : page Factures) ── */}
                    {payments.length > 0 && (
                        <section>
                            <div className="mb-3 flex items-end justify-between gap-3">
                                <h2 className="text-[15px] font-semibold text-ink">Dernière facture</h2>
                                <Link
                                    href={invoicesIndex().url}
                                    className="group inline-flex items-center gap-1 text-sm font-medium text-motriks-deep hover:underline"
                                >
                                    Toutes les factures
                                    {paymentsCount > 1 ? ` (${paymentsCount})` : ''}
                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </div>
                            {payments.slice(0, 1).map((p) => (
                                <div key={p.id} className={cn(card, 'flex flex-wrap items-center gap-4 px-5 py-4')}>
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                        <FileText className="size-[18px]" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-ink tabular-nums">
                                            {fcfa.format(p.amount)} {currencyLabel(p.currency)}
                                            {p.plan && <span className="font-normal text-slate-500"> · {p.plan}</span>}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                            {p.invoice_number} · {p.method} · payée le {p.paid_at}
                                            {p.period_end ? ` · jusqu’au ${p.period_end}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setPreview(p)} className={buttonClass('ghost', 'sm')}>
                                            <Eye />
                                            Voir
                                        </button>
                                        <a href={invoiceDownload(p.id).url} download className={buttonClass('secondary', 'sm')}>
                                            <Download />
                                            Facture PDF
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}
                </div>
            </Page>

            <InvoicePreviewModal invoice={preview} open={preview !== null} onClose={() => setPreview(null)} client={client} />
        </>
    );
}

CompanySubscription.layout = {
    breadcrumbs: [{ title: 'Abonnement', href: companySubscription().url }],
};
