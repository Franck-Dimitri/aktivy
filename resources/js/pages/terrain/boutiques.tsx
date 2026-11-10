import { Head } from '@inertiajs/react';
import { ArrowRight, ClipboardList, Info, Store } from 'lucide-react';
import { ActionLink } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { StatStrip } from '@/components/page/stat-strip';
import { cn } from '@/lib/utils';
import { externalShops as terrainExternalShops, home as terrainHome } from '@/routes/terrain';
import { show as reportShow } from '@/routes/terrain/report';

type Line = { id: number; product_name: string; unit: string; unit_price: number; units: number; revenue: number };

type Day = {
    date: string;
    date_label: string;
    site_name: string | null;
    visit_id: number;
    submitted: boolean;
    revenue: number;
    shops: { shop: string; revenue: number; lines: Line[] }[];
};

type Props = {
    summary: { month_revenue: number; month_units: number; month_shops: number; days: number };
    shops: { shop: string; revenue: number; units: number; days: number }[];
    days: Day[];
};

const card = 'rounded-2xl border border-slate-200/80 bg-white';

const fcfa = (amount: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);

function Money({ amount }: { amount: number }) {
    return (
        <span className="whitespace-nowrap">
            {fcfa(amount)} <small>FCFA</small>
        </span>
    );
}

/** Ventes en boutique extérieure de l'hôtesse : ce mois-ci par boutique, puis jour par jour. */
export default function TerrainBoutiques({ summary, shops, days }: Props) {
    const best = shops[0];
    const maxShop = Math.max(...shops.map((s) => s.revenue), 1);

    return (
        <>
            <Head title="Boutiques extérieures" />

            <Page
                title="Boutiques extérieures"
                description="Vos ventes faites hors de votre point de vente, avec les mêmes produits et aux mêmes prix."
                actions={
                    <ActionLink href={terrainHome().url} variant="secondary" icon={<ClipboardList />}>
                        Rapport du jour
                    </ActionLink>
                }
            >
                <div className="flex flex-col gap-4">
                    {/* Comment ça marche */}
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-600">
                        <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
                        <p>
                            Saisissez ces ventes dans votre <span className="font-medium text-ink">rapport du jour</span>, section « Boutiques extérieures ». Elles
                            comptent dans votre chiffre d’affaires et vos objectifs, mais ne sortent pas du stock de votre point de vente.
                        </p>
                    </div>

                    {days.length === 0 ? (
                        <div className={cn(card, 'p-10 sm:p-16')}>
                            <EmptyState
                                icon={Store}
                                title="Aucune vente en boutique extérieure"
                                description={`Vos ventes hors de votre point de vente des ${summary.days} derniers jours apparaîtront ici.`}
                            />
                        </div>
                    ) : (
                        <>
                            <StatStrip
                                items={[
                                    { label: 'Ce mois-ci', value: <Money amount={summary.month_revenue} />, sub: 'hors point de vente' },
                                    { label: 'Unités vendues', value: fcfa(summary.month_units), sub: 'ce mois-ci' },
                                    { label: 'Boutiques', value: summary.month_shops, sub: 'ce mois-ci' },
                                    best
                                        ? {
                                              label: 'Meilleure boutique',
                                              value: <span className="block truncate text-base leading-7 font-semibold">{best.shop}</span>,
                                              sub: `${fcfa(best.revenue)} FCFA`,
                                          }
                                        : { label: 'Meilleure boutique', value: '–', sub: 'aucune vente ce mois-ci' },
                                ]}
                            />

                            {shops.length > 0 && (
                                <section className={cn(card, 'overflow-hidden')}>
                                    <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-ink">Ce mois-ci, par boutique</h2>
                                    <ul className="divide-y divide-slate-100">
                                        {shops.map((s) => (
                                            <li key={s.shop} className="relative px-5 py-3">
                                                <span
                                                    aria-hidden="true"
                                                    className="pointer-events-none absolute inset-y-0 left-0 bg-motriks/[0.05]"
                                                    style={{ width: `${Math.round((s.revenue / maxShop) * 100)}%` }}
                                                />
                                                <div className="relative flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-ink">{s.shop}</p>
                                                        <p className="text-xs text-slate-500 tabular-nums">
                                                            {s.units} unité{s.units > 1 ? 's' : ''} · {s.days} jour{s.days > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <p className="shrink-0 text-sm font-bold text-motriks-deep tabular-nums">
                                                        <Money amount={s.revenue} />
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <h2 className="mt-2 px-1 text-sm font-semibold text-ink">Jour par jour · {summary.days} derniers jours</h2>
                            {days.map((day) => (
                                <section key={day.date} className={cn(card, 'overflow-hidden')}>
                                    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-3.5">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ink first-letter:uppercase">{day.date_label}</p>
                                            <p className="text-xs text-slate-500">
                                                {day.site_name ? `Rapport de ${day.site_name}` : 'Rapport du jour'}
                                                {!day.submitted && <span className="ml-1 font-medium text-amber-700">· brouillon</span>}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-bold text-motriks-deep tabular-nums">
                                                <Money amount={day.revenue} />
                                            </p>
                                            <ActionLink
                                                href={reportShow({ visit: day.visit_id }).url}
                                                variant="secondary"
                                                size="sm"
                                                icon={<ArrowRight className="order-last" />}
                                            >
                                                {day.submitted ? 'Rapport' : 'Compléter'}
                                            </ActionLink>
                                        </div>
                                    </header>
                                    <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
                                        {day.shops.map((shop) => (
                                            <div key={shop.shop} className="bg-white px-5 py-3.5">
                                                <p className="flex items-center justify-between gap-3 text-sm">
                                                    <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                                                        <Store className="size-4 shrink-0 text-slate-400" />
                                                        <span className="truncate">{shop.shop}</span>
                                                    </span>
                                                    <span className="shrink-0 font-semibold text-ink tabular-nums">{fcfa(shop.revenue)}</span>
                                                </p>
                                                <ul className="mt-1.5 flex flex-col gap-0.5 pl-6 text-xs text-slate-500">
                                                    {shop.lines.map((l) => (
                                                        <li key={l.id} className="flex justify-between gap-3 tabular-nums">
                                                            <span className="truncate">
                                                                {l.units} × {l.product_name}
                                                            </span>
                                                            <span className="shrink-0">{fcfa(l.revenue)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </>
                    )}
                </div>
            </Page>
        </>
    );
}

TerrainBoutiques.layout = {
    breadcrumbs: [{ title: 'Boutiques extérieures', href: terrainExternalShops().url }],
};
