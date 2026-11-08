import { Head, Link } from '@inertiajs/react';
import { Download, Eye, Receipt } from 'lucide-react';
import { InvoicePreviewModal, type InvoiceItem } from '@/components/invoices/invoice-preview';
import { useMemo, useState } from 'react';
import { buttonClass } from '@/components/page/buttons';
import { Page } from '@/components/page/page';
import { MetricStrip } from '@/components/page/surface';
import { QuietEmpty, Segmented } from '@/components/page/list-kit';
import { cn } from '@/lib/utils';
import { subscription as companySubscription } from '@/routes/company';
import { download as invoiceDownload, index as invoicesIndex } from '@/routes/company/invoices';
import { currencyLabel, number } from '@/pages/reports/format';

export type Invoice = InvoiceItem & {
    extra_packs: number;
    period_start: string | null;
};

type Props = {
    /** Entreprise facturée (en-tête de l’aperçu). */
    client: string;
    invoices: Invoice[];
    summary: {
        count: number;
        total: number;
        this_year: number;
        currency: string;
        last_paid_at: string | null;
        next_due: string | null;
        plan: string;
    };
};

const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-xs';

const year = (date: string) => date.slice(-4);

/** Factures d'abonnement Motriks : résumé, puis la liste, année par année. */
export default function Invoices({ invoices, summary, client }: Props) {
    const [open, setOpen] = useState<Invoice | null>(null);
    const unit = currencyLabel(summary.currency);
    const years = useMemo(() => [...new Set(invoices.map((i) => year(i.paid_at)))], [invoices]);
    const [shown, setShown] = useState<string>('all');
    const visible = shown === 'all' ? invoices : invoices.filter((i) => year(i.paid_at) === shown);

    const amount = (n: number) => (
        <>
            {number.format(n)} <span className="text-sm font-normal text-slate-500">{unit}</span>
        </>
    );

    return (
        <>
            <Head title="Factures" />

            <Page title="Factures" description="Vos factures d’abonnement Motriks, à télécharger en PDF.">
                <div className="flex flex-col gap-8">
                    <MetricStrip
                        items={[
                            {
                                label: 'Payé cette année',
                                value: amount(summary.this_year),
                            },
                            {
                                label: 'Total payé',
                                value: amount(summary.total),
                            },
                            { label: 'Factures', value: summary.count },
                            {
                                label: 'Prochaine échéance',
                                value: summary.next_due ?? '—',
                                sub: summary.plan,
                            },
                        ]}
                    />

                    {invoices.length === 0 ? (
                        <div className={card}>
                            <QuietEmpty icon={Receipt} title="Aucune facture pour le moment">
                                Vos factures apparaîtront ici après votre premier paiement.{' '}
                                <Link href={companySubscription().url} className="font-semibold text-motriks-deep hover:underline">
                                    Voir les forfaits
                                </Link>
                            </QuietEmpty>
                        </div>
                    ) : (
                        <section className="flex flex-col gap-3">
                            {years.length > 1 && (
                                <div>
                                    <Segmented
                                        label="Année"
                                        value={shown}
                                        onChange={setShown}
                                        options={[
                                            { value: 'all', label: 'Toutes' },
                                            ...years.map((y) => ({
                                                value: y,
                                                label: y,
                                            })),
                                        ]}
                                    />
                                </div>
                            )}

                            <div className={cn(card, 'overflow-hidden')}>
                                {/* En-têtes (ordinateur) */}
                                <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_1.2fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-xs font-medium text-slate-500 lg:grid">
                                    <span>Facture</span>
                                    <span>Date</span>
                                    <span>Période</span>
                                    <span>Forfait</span>
                                    <span className="text-right">Montant</span>
                                    <span className="w-[11rem]" />
                                </div>

                                <ul className="divide-y divide-slate-100">
                                    {visible.map((i) => (
                                        <li
                                            key={i.id}
                                            onClick={() => setOpen(i)}
                                            className="grid cursor-pointer gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 lg:grid-cols-[1.2fr_1fr_1.4fr_1.2fr_1fr_auto] lg:items-center lg:gap-4 lg:px-6"
                                        >
                                            <div className="flex min-w-0 items-center justify-between gap-3 lg:block">
                                                <p className="truncate text-[13px] font-semibold tracking-tight text-ink tabular-nums">
                                                    {i.invoice_number}
                                                </p>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-motriks-soft px-2 py-0.5 text-[11px] font-medium text-motriks-deep lg:mt-1">
                                                    <span className="size-1.5 rounded-full bg-motriks" />
                                                    Payée
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 tabular-nums">
                                                <span className="text-xs text-slate-400 lg:hidden">Payée le </span>
                                                {i.paid_at}
                                                <span className="block text-xs text-slate-400">{i.method}</span>
                                            </p>
                                            <p className="text-sm text-slate-600 tabular-nums">
                                                {i.period_start && i.period_end ? (
                                                    <>
                                                        {i.period_start} <span className="text-slate-300">→</span> {i.period_end}
                                                    </>
                                                ) : i.period_end ? (
                                                    `Jusqu’au ${i.period_end}`
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </p>
                                            <p className="min-w-0 truncate text-sm text-slate-600">
                                                {i.plan ?? '—'}
                                                {i.extra_packs > 0 && (
                                                    <span className="text-slate-400">
                                                        {' '}
                                                        · +{i.extra_packs} pack
                                                        {i.extra_packs > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-base font-semibold text-ink tabular-nums lg:text-right lg:text-sm">
                                                {number.format(i.amount)}{' '}
                                                <span className="text-xs font-normal text-slate-500">{currencyLabel(i.currency)}</span>
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 lg:flex lg:w-[11rem]" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpen(i)}
                                                    className={cn(buttonClass('ghost', 'sm'), 'lg:flex-1')}
                                                >
                                                    <Eye />
                                                    Voir
                                                </button>
                                                <a href={invoiceDownload(i.id).url} className={cn(buttonClass('secondary', 'sm'), 'lg:flex-1')}>
                                                    <Download />
                                                    PDF
                                                </a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <p className="text-xs text-slate-500">
                                Une question sur une facture ? Écrivez-nous depuis le centre d’aide, avec son numéro.
                            </p>
                        </section>
                    )}
                </div>
            </Page>

            <InvoicePreviewModal invoice={open} open={open !== null} onClose={() => setOpen(null)} client={client} />
        </>
    );
}

Invoices.layout = {
    breadcrumbs: [
        { title: 'Abonnement', href: companySubscription().url },
        { title: 'Factures', href: invoicesIndex().url },
    ],
};
