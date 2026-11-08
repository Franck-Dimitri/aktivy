import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, PackageCheck, PackagePlus, Search, Siren, Store } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { index as sitesIndex, show as siteShow } from '@/routes/sites';
import { restock as inventoryRestock } from '@/routes/sites/inventory';
import { index as stockAlertsIndex } from '@/routes/stock-alerts';

type Alert = {
    id: number;
    site_id: number;
    site_name: string;
    site_city: string | null;
    product_name: string;
    unit: string;
    current_stock: number;
    alert_threshold: number;
    critical_threshold: number;
    level: 'critical' | 'warning';
};

type Filter = 'all' | Alert['level'];

/** Jauge : stock actuel rapporté au seuil d'alerte, avec un repère au seuil critique. */
function StockGauge({ alert }: { alert: Alert }) {
    const max = Math.max(alert.alert_threshold, 1);
    const fill = Math.min(100, (Math.max(alert.current_stock, 0) / max) * 100);
    const criticalAt = Math.min(100, (alert.critical_threshold / max) * 100);
    const critical = alert.level === 'critical';

    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={cn('font-semibold tabular-nums', critical ? 'text-red-600' : 'text-amber-600')}>
                    {alert.current_stock} {alert.unit}
                </span>
                <span className="text-slate-400 tabular-nums">seuil {alert.alert_threshold}</span>
            </div>
            <div
                className="relative mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-white/10"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={alert.alert_threshold}
                aria-valuenow={alert.current_stock}
                aria-label={`Stock de ${alert.product_name}`}
            >
                <div className={cn('h-full rounded-full', critical ? 'bg-red-500' : 'bg-amber-400')} style={{ width: `${Math.max(fill, 3)}%` }} />
                {alert.critical_threshold > 0 && (
                    <span
                        aria-hidden
                        title={`Seuil critique : ${alert.critical_threshold}`}
                        className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-red-300 dark:bg-red-400/60"
                        style={{ left: `calc(${criticalAt}% - 1px)` }}
                    />
                )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 tabular-nums">critique à {alert.critical_threshold}</p>
        </div>
    );
}

/** Réassort en ligne : la quantité livrée s'ajoute au stock du site. */
function RestockForm({ alert }: { alert: Alert }) {
    const [quantity, setQuantity] = useState('');
    const [saving, setSaving] = useState(false);
    // Quantité minimale pour repasser au-dessus du seuil d'alerte
    const toSafe = Math.max(1, alert.alert_threshold - alert.current_stock + 1);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            inventoryRestock({ site: alert.site_id, inventory: alert.id }).url,
            { quantity: Number(quantity) },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Réassort enregistré', { description: `${alert.product_name} · ${alert.site_name} : +${quantity} ${alert.unit}` });
                    setQuantity('');
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <form onSubmit={submit} className="flex flex-col items-stretch gap-1.5 sm:items-end">
            <div className="flex items-center gap-2">
                <TextInput
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Qté livrée"
                    className="h-9 w-full sm:w-28"
                    aria-label={`Quantité livrée de ${alert.product_name} à ${alert.site_name}`}
                />
                <ActionButton type="submit" size="sm" icon={<PackagePlus />} loading={saving} disabled={!(Number(quantity) > 0)} className="h-9 rounded-xl">
                    Réassort
                </ActionButton>
            </div>
            <button type="button" onClick={() => setQuantity(String(toSafe))} className="text-left text-[11px] font-medium text-slate-400 transition-colors hover:text-motriks-deep sm:text-right">
                +{toSafe} pour repasser au-dessus du seuil
            </button>
        </form>
    );
}

export default function StockAlertsIndex({ alerts }: { alerts: Alert[] }) {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');

    const critical = alerts.filter((a) => a.level === 'critical').length;
    const sites = new Set(alerts.map((a) => a.site_id)).size;

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return alerts.filter((a) => (filter === 'all' || a.level === filter) && (!q || `${a.product_name} ${a.site_name} ${a.site_city ?? ''}`.toLowerCase().includes(q)));
    }, [alerts, filter, query]);

    return (
        <>
            <Head title="Alertes de stock" />

            <Page title="Alertes de stock" description="Produits sous leur seuil d’alerte, à réapprovisionner en priorité.">
                {alerts.length === 0 ? (
                    <section className="flex flex-col items-start gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.03] sm:flex-row sm:items-center dark:border-sidebar-border dark:bg-card">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-motriks-soft text-motriks-deep ring-8 ring-motriks-soft/40">
                            <PackageCheck className="size-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[15px] font-semibold text-ink">Stock sain sur tous vos points de vente</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Aucun produit n’est sous son seuil d’alerte. Vous serez prévenu sous la cloche dès qu’un stock passe sous son seuil critique.
                            </p>
                        </div>
                        <Link href={sitesIndex().url} className={buttonClass('secondary', 'md')}>
                            Régler les seuils
                            <ArrowRight />
                        </Link>
                    </section>
                ) : (
                    <>
                        <MetricRow
                            items={[
                                { label: 'Critiques', value: critical, hint: 'Sous le seuil critique', icon: Siren, tone: critical ? 'red' : 'default', pulse: critical > 0 },
                                { label: 'En alerte', value: alerts.length - critical, hint: 'Sous le seuil d’alerte', icon: AlertTriangle, tone: alerts.length - critical ? 'amber' : 'default' },
                                { label: 'Points de vente', value: sites, hint: sites > 1 ? 'Concernés' : 'Concerné', icon: Store },
                            ]}
                        />

                        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sidebar-border">
                                <Segmented
                                    label="Filtrer par niveau"
                                    value={filter}
                                    onChange={setFilter}
                                    options={[
                                        { value: 'all', label: 'Toutes', count: alerts.length },
                                        { value: 'critical', label: 'Critiques', count: critical },
                                        { value: 'warning', label: 'En alerte', count: alerts.length - critical },
                                    ]}
                                />
                                <div className="sm:w-72">
                                    <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Produit ou point de vente" aria-label="Rechercher une alerte" className="h-9" />
                                </div>
                            </div>

                            {shown.length === 0 ? (
                                <QuietEmpty icon={Search} title="Aucune alerte ne correspond">
                                    Modifiez la recherche ou le filtre.
                                </QuietEmpty>
                            ) : (
                                <>
                                    <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-6 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase md:grid dark:border-sidebar-border dark:bg-white/[0.02]">
                                        <span>Produit</span>
                                        <span>Niveau de stock</span>
                                        <span className="w-[224px] text-right">Réassort</span>
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                        {shown.map((a) => (
                                            <li key={a.id} className="relative grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
                                                {a.level === 'critical' && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-red-500" />}
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <span
                                                        className={cn(
                                                            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                                                            a.level === 'critical' ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
                                                        )}
                                                    >
                                                        {a.level === 'critical' ? <Siren className="size-4" /> : <AlertTriangle className="size-4" />}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="truncate text-sm font-semibold text-ink">{a.product_name}</p>
                                                            <StatusBadge tone={a.level === 'critical' ? 'danger' : 'warning'}>{a.level === 'critical' ? 'Critique' : 'Alerte'}</StatusBadge>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                                            <Link href={siteShow(a.site_id).url} className="font-medium text-slate-600 hover:text-motriks-deep hover:underline dark:text-slate-300">
                                                                {a.site_name}
                                                            </Link>
                                                            {a.site_city && ` · ${a.site_city}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <StockGauge alert={a} />

                                                <div className="md:w-[224px]">
                                                    <RestockForm alert={a} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 dark:border-sidebar-border">Les plus urgents en premier. Les seuils se règlent sur la fiche de chaque site.</p>
                        </section>
                    </>
                )}
            </Page>
        </>
    );
}

StockAlertsIndex.layout = {
    breadcrumbs: [{ title: 'Alertes de stock', href: stockAlertsIndex().url }],
};
