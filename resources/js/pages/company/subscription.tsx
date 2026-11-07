import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Clock, Download, Lock, Mail } from 'lucide-react';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { contact } from '@/routes';
import { show as invoiceShow } from '@/routes/company/invoices';
import { subscription as companySubscription } from '@/routes/company';

type ModuleRow = {
    key: string;
    label: string;
    description: string;
    active: boolean;
    is_trial: boolean;
    ends_on: string | null;
    days_left: number | null;
};

function Badge({ m }: { m: ModuleRow }) {
    if (!m.active) return <StatusBadge tone="neutral">Inactif</StatusBadge>;
    if (m.is_trial) return <StatusBadge tone="info">Essai{m.days_left !== null ? ` · ${m.days_left} j restants` : ''}</StatusBadge>;
    if (m.days_left !== null && m.days_left <= 30) return <StatusBadge tone="warning">Fin le {m.ends_on}</StatusBadge>;

    return <StatusBadge tone="success">{m.ends_on ? `Actif jusqu’au ${m.ends_on}` : 'Actif'}</StatusBadge>;
}

type Payment = { id: number; invoice_number: string; amount: number; currency: string; method: string; paid_at: string; period_end: string | null };

const amount = new Intl.NumberFormat('fr-FR');

export default function CompanySubscription({ modules, payments = [] }: { modules: ModuleRow[]; payments?: Payment[] }) {
    const active = modules.filter((m) => m.active).length;

    return (
        <>
            <Head title="Abonnement" />

            <Page title="Abonnement" description={`${active} module${active > 1 ? 's' : ''} payant${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''} sur ${modules.length}. Le socle reste gratuit : sites, personnel, affectations, produits, paramètres.`}>
                <div className="flex flex-col gap-6">
                    <Panel>
                        <ul className="divide-y divide-slate-100">
                            {modules.map((m) => (
                                <li key={m.key} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                                    <div className="flex min-w-0 flex-1 gap-3">
                                        <span className="mt-0.5 shrink-0">
                                            {m.active ? (m.is_trial ? <Clock className="size-5 text-sky-600" /> : <CheckCircle2 className="size-5 text-motriks" />) : <Lock className="size-5 text-slate-300" />}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ink">{m.label}</p>
                                            <p className="mt-0.5 text-sm text-slate-500">{m.description}</p>
                                        </div>
                                    </div>
                                    <Badge m={m} />
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    {payments.length > 0 && (
                        <Panel title="Paiements et factures">
                            <ul className="divide-y divide-slate-100">
                                {payments.map((p) => (
                                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-ink">
                                                {amount.format(p.amount)} {p.currency === 'XAF' ? 'FCFA' : p.currency}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Facture {p.invoice_number} · {p.method} · payée le {p.paid_at}
                                                {p.period_end ? ` · jusqu’au ${p.period_end}` : ''}
                                            </p>
                                        </div>
                                        <a href={invoiceShow(p.id).url} className="inline-flex items-center gap-1.5 text-xs font-semibold text-motriks-deep hover:underline">
                                            <Download className="size-3.5" />
                                            Télécharger la facture
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    <Panel>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                            <p className="text-sm text-slate-600">
                                Pour activer, prolonger ou changer de formule, contactez-nous. Vos données sont toujours conservées.
                            </p>
                            <Link href={contact().url} className="inline-flex items-center gap-2 text-sm font-semibold text-motriks-deep hover:underline">
                                <Mail className="size-4" />
                                Nous contacter
                            </Link>
                        </div>
                    </Panel>
                </div>
            </Page>
        </>
    );
}

CompanySubscription.layout = {
    breadcrumbs: [{ title: 'Abonnement', href: companySubscription().url }],
};
