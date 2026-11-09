import { Head, Link, router } from '@inertiajs/react';
import { Download, Eye, Receipt, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InvoicePreviewModal, type InvoiceItem, type InvoiceUrls } from '@/components/invoices/invoice-preview';
import { buttonClass } from '@/components/page/buttons';
import { SelectInput, TextInput } from '@/components/page/form-fields';
import { CompanyAvatar, QuietEmpty } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { currencyLabel, number } from '@/pages/reports/format';
import { dashboard } from '@/routes/admin';
import { show as companyShow } from '@/routes/admin/companies';
import { index as invoicesIndex, preview as invoicePreview } from '@/routes/admin/invoices';
import { index as subscriptionsIndex, invoice as invoiceDownload } from '@/routes/admin/subscriptions';

type Invoice = InvoiceItem & {
    company_id: number;
    company: string | null;
    extra_packs: number;
    period_start: string | null;
};

type Filters = { q: string; annee: number | null; moyen: string | null };

type Props = {
    invoices: Paginated<Invoice>;
    filters: Filters;
    years: number[];
    methods: { key: string; label: string }[];
    summary: { count: number; total: number; this_year: number; this_month: number; companies: number };
};

/** Adresses admin du PDF (objet stable, hors du composant). */
const ADMIN_URLS: InvoiceUrls = { preview: (id) => invoicePreview(id).url, download: (id) => invoiceDownload(id).url };

const fcfa = (n: number) => (
    <>
        {number.format(n)} <span className="text-sm font-normal text-slate-500">FCFA</span>
    </>
);

/** Toutes les factures émises par Motriks : recherche, filtres, aperçu du PDF et téléchargement. */
export default function AdminInvoices({ invoices, filters, years, methods, summary }: Props) {
    // Facture affichée, gardée pendant l'animation de fermeture
    const [selected, setSelected] = useState<Invoice | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const show = (invoice: Invoice) => {
        setSelected(invoice);
        setIsOpen(true);
    };
    const [q, setQ] = useState(filters.q);
    const first = useRef(true);

    const apply = (next: Partial<Filters>) => {
        const merged = { ...filters, q, ...next };
        router.get(invoicesIndex().url, Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== null && v !== '')), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Recherche au fil de la frappe, sans requête à chaque touche
    useEffect(() => {
        if (first.current) {
            first.current = false;

            return;
        }

        const timer = setTimeout(() => apply({ q }), 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const filtered = Boolean(filters.q || filters.annee || filters.moyen);

    return (
        <>
            <Head title="Factures" />

            <Page title="Factures" description="Toutes les factures émises par Motriks, entreprise par entreprise.">
                <div className="flex flex-col gap-6">
                    <MetricStrip
                        items={[
                            { label: 'Encaissé ce mois-ci', value: fcfa(summary.this_month) },
                            { label: 'Encaissé cette année', value: fcfa(summary.this_year) },
                            {
                                label: 'Total encaissé',
                                value: fcfa(summary.total),
                                sub: `${summary.companies} entreprise${summary.companies > 1 ? 's' : ''}`,
                            },
                            { label: 'Factures émises', value: number.format(summary.count) },
                        ]}
                    />

                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                        {/* Filtres */}
                        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
                            <div className="sm:flex-1">
                                <TextInput
                                    icon={Search}
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Numéro, entreprise ou référence"
                                    aria-label="Rechercher une facture"
                                    className="h-10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:flex">
                                <SelectInput
                                    aria-label="Année"
                                    value={filters.annee ?? ''}
                                    onChange={(e) => apply({ annee: e.target.value ? Number(e.target.value) : null })}
                                    className="h-10 sm:w-32"
                                >
                                    <option value="">Année</option>
                                    {years.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </SelectInput>
                                <SelectInput
                                    aria-label="Moyen de paiement"
                                    value={filters.moyen ?? ''}
                                    onChange={(e) => apply({ moyen: e.target.value || null })}
                                    className="h-10 sm:w-48"
                                >
                                    <option value="">Moyen de paiement</option>
                                    {methods.map((m) => (
                                        <option key={m.key} value={m.key}>
                                            {m.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            {filtered && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQ('');
                                        router.get(invoicesIndex().url, {}, { preserveScroll: true, replace: true });
                                    }}
                                    className={cn(buttonClass('ghost', 'sm'), 'self-start sm:self-center')}
                                >
                                    <X />
                                    Effacer
                                </button>
                            )}
                        </div>

                        {invoices.data.length === 0 ? (
                            filtered ? (
                                <QuietEmpty icon={Search} title="Aucune facture ne correspond">
                                    Modifiez la recherche ou les filtres.
                                </QuietEmpty>
                            ) : (
                                <QuietEmpty
                                    icon={Receipt}
                                    title="Aucune facture pour le moment"
                                    action={
                                        <Link href={subscriptionsIndex().url} className="font-semibold text-motriks-deep hover:underline">
                                            Enregistrer un paiement
                                        </Link>
                                    }
                                >
                                    Chaque paiement enregistré dans Abonnements crée sa facture.
                                </QuietEmpty>
                            )
                        ) : (
                            <>
                                {/* En-têtes (ordinateur) */}
                                <div className="hidden grid-cols-[1.6fr_1fr_1.1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase lg:grid">
                                    <span>Entreprise</span>
                                    <span>Facture</span>
                                    <span>Forfait et période</span>
                                    <span className="text-right">Montant</span>
                                    <span className="w-[11rem]" />
                                </div>

                                <ul className="divide-y divide-slate-100">
                                    {invoices.data.map((i) => (
                                        <li
                                            key={i.id}
                                            onClick={() => show(i)}
                                            className="grid cursor-pointer gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 lg:grid-cols-[1.6fr_1fr_1.1fr_1fr_auto] lg:items-center lg:gap-4 lg:px-6"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <CompanyAvatar name={i.company ?? '?'} className="size-9 text-xs" />
                                                <div className="min-w-0">
                                                    <Link
                                                        href={companyShow(i.company_id).url}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="block truncate text-sm font-semibold text-ink hover:text-motriks-deep hover:underline"
                                                    >
                                                        {i.company ?? 'Entreprise supprimée'}
                                                    </Link>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {i.method}
                                                        {i.reference ? ` · réf. ${i.reference}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-3 lg:block">
                                                <p className="text-[13px] font-semibold tracking-tight text-ink tabular-nums">{i.invoice_number}</p>
                                                <p className="text-xs text-slate-500 tabular-nums">Payée le {i.paid_at}</p>
                                            </div>

                                            <div className="min-w-0 text-sm text-slate-600">
                                                <p className="truncate">
                                                    {i.plan ?? '—'}
                                                    {i.extra_packs > 0 && (
                                                        <span className="text-slate-400">
                                                            {' '}
                                                            · +{i.extra_packs} pack{i.extra_packs > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </p>
                                                {i.period_end && (
                                                    <p className="text-xs text-slate-400 tabular-nums">
                                                        {i.period_start ?? i.paid_at} → {i.period_end}
                                                    </p>
                                                )}
                                            </div>

                                            <p className="text-base font-semibold text-ink tabular-nums lg:text-right lg:text-sm">
                                                {number.format(i.amount)}{' '}
                                                <span className="text-xs font-normal text-slate-500">{currencyLabel(i.currency)}</span>
                                            </p>

                                            <div className="grid grid-cols-2 gap-2 lg:flex lg:w-[11rem]" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => show(i)} className={cn(buttonClass('ghost', 'sm'), 'lg:flex-1')}>
                                                    <Eye />
                                                    Voir
                                                </button>
                                                <a href={invoiceDownload(i.id).url} download className={cn(buttonClass('secondary', 'sm'), 'lg:flex-1')}>
                                                    <Download />
                                                    PDF
                                                </a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className="border-t border-slate-100">
                                    <Pagination page={invoices} />
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </Page>

            <InvoicePreviewModal invoice={selected} open={isOpen} onClose={() => setIsOpen(false)} client={selected?.company} urls={ADMIN_URLS} />
        </>
    );
}

AdminInvoices.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Factures', href: invoicesIndex().url },
    ],
};
