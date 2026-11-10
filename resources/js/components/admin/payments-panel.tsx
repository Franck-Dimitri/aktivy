import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { Panel } from '@/components/page/page';
import { packSummary } from '@/components/plans/plan-usage';
import { invoice as invoiceDownload } from '@/routes/admin/subscriptions';
import { currencyLabel, number } from '@/pages/reports/format';

export type PaymentRow = {
    id: number;
    invoice_number: string;
    company_id: number;
    company: string | null;
    amount: number;
    currency: string;
    method: string;
    plan?: string | null;
    extra_packs?: number;
    supervisor_packs?: number;
    reference: string | null;
    paid_at: string;
    period_end: string | null;
};

/** Montant en francs CFA (XAF ou XOF), au format français. */
export const fcfa = (amount: number, currency = 'XAF') => `${number.format(amount)} ${currencyLabel(currency)}`;

/** Derniers paiements, avec leur facture à télécharger. */
export function PaymentsPanel({ payments, showCompany = false, actions }: { payments: PaymentRow[]; showCompany?: boolean; actions?: ReactNode }) {
    return (
        <Panel title="Paiements reçus" description={showCompany ? 'Les 50 derniers, toutes entreprises.' : undefined} actions={actions}>
            {payments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">Aucun paiement enregistré.</p>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                    {payments.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                            <div className="min-w-0">
                                <p className="font-semibold text-ink">
                                    {fcfa(p.amount, p.currency)}
                                    {showCompany && p.company && <span className="font-normal text-slate-500"> · {p.company}</span>}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {p.invoice_number}
                                    {p.plan ? ` · ${p.plan}` : ''}
                                    {packSummary(p.extra_packs ?? 0, p.supervisor_packs ?? 0) ? ` + ${packSummary(p.extra_packs ?? 0, p.supervisor_packs ?? 0)}` : ''} · {p.method}
                                    {p.reference ? ` · réf. ${p.reference}` : ''} · reçu le {p.paid_at}
                                    {p.period_end ? ` · jusqu’au ${p.period_end}` : ''}
                                </p>
                            </div>
                            <a
                                href={invoiceDownload(p.id).url}
                                download
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-motriks-deep hover:underline"
                            >
                                <Download className="size-3.5" />
                                Facture
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}
