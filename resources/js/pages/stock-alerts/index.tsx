import { Head, Link, router } from '@inertiajs/react';
import { PackageCheck, PackagePlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { show as siteShow } from '@/routes/sites';
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

/** Réassort en ligne : la quantité livrée s'ajoute au stock du site. */
function RestockForm({ alert }: { alert: Alert }) {
    const [quantity, setQuantity] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            inventoryRestock({ site: alert.site_id, inventory: alert.id }).url,
            { quantity: Number(quantity) },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Réassort enregistré', {
                        description: `${alert.product_name} : +${quantity}`,
                    });
                    setQuantity('');
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <form onSubmit={submit} className="flex items-center gap-2">
            <TextInput
                type="number"
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qté livrée"
                className="h-9 w-28"
                aria-label={`Quantité livrée de ${alert.product_name} à ${alert.site_name}`}
            />
            <ActionButton
                type="submit"
                size="sm"
                icon={<PackagePlus />}
                loading={saving}
                disabled={!(Number(quantity) > 0)}
            >
                Réassort
            </ActionButton>
        </form>
    );
}

export default function StockAlertsIndex({ alerts }: { alerts: Alert[] }) {
    const critical = alerts.filter((a) => a.level === 'critical').length;
    const sites = new Set(alerts.map((a) => a.site_id)).size;

    return (
        <>
            <Head title="Alertes de stock" />
            <GlowStyles />

            <Page
                title="Alertes de stock"
                description="Produits sous leur seuil d’alerte, à réapprovisionner en priorité."
            >
                <div className="flex flex-col gap-6">
                    <MetricStrip
                        items={[
                            {
                                label: 'Critiques',
                                value: critical,
                                sub: 'sous le seuil critique',
                            },
                            {
                                label: 'En alerte',
                                value: alerts.length - critical,
                                sub: 'sous le seuil d’alerte',
                            },
                            {
                                label: 'Points de vente',
                                value: sites,
                                sub: 'concernés',
                            },
                        ]}
                    />

                    <Panel
                        title="À réapprovisionner"
                        description="Les plus urgents en premier. Les seuils se règlent sur la fiche de chaque site."
                    >
                        {alerts.length === 0 ? (
                            <div className="p-10">
                                <EmptyState
                                    icon={PackageCheck}
                                    title="Aucune alerte"
                                    description="Tous les produits suivis sont au-dessus de leur seuil d’alerte."
                                />
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {alerts.map((a) => (
                                    <li
                                        key={a.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-ink">
                                                    {a.product_name}
                                                </p>
                                                <StatusBadge
                                                    tone={
                                                        a.level === 'critical'
                                                            ? 'danger'
                                                            : 'warning'
                                                    }
                                                >
                                                    {a.level === 'critical'
                                                        ? 'Critique'
                                                        : 'Alerte'}
                                                </StatusBadge>
                                            </div>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                <Link
                                                    href={
                                                        siteShow(a.site_id).url
                                                    }
                                                    className="font-medium text-motriks-deep hover:underline"
                                                >
                                                    {a.site_name}
                                                </Link>
                                                {a.site_city &&
                                                    ` · ${a.site_city}`}{' '}
                                                · reste{' '}
                                                <span className="font-semibold text-ink">
                                                    {a.current_stock} {a.unit}
                                                </span>{' '}
                                                · alerte {a.alert_threshold},
                                                critique {a.critical_threshold}
                                            </p>
                                        </div>
                                        <RestockForm alert={a} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </Page>
        </>
    );
}

StockAlertsIndex.layout = {
    breadcrumbs: [{ title: 'Alertes de stock', href: stockAlertsIndex().url }],
};
