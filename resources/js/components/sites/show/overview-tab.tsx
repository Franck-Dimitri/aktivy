import { CalendarRange, Package } from 'lucide-react';
import { type InventoryItem } from '@/components/sites/site-inventory';
import {
    SitePerformance,
    type SitePerformanceData,
} from '@/components/sites/site-performance';
import { EmptyState } from '@/components/page/empty-state';
import { StatusBadge } from '@/components/page/status-badge';
import { MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import type { SiteAffectation } from '@/types';
import { compactAmount, formatDuration } from '@/lib/format';
import {
    type ChartData,
    type SiteStats,
    type TabKey,
} from '@/components/sites/show/types';
import { stockStyle } from '@/components/sites/show/constants';
import { Section, Avatar } from '@/components/sites/show/ui';
import { VisitsChart } from '@/components/sites/show/visits-chart';

/* ───────────── Onglet Aperçu ───────────── */

type OverviewTabProps = {
    stats: SiteStats;
    chart: ChartData;
    performance: SitePerformanceData;
    affectations: SiteAffectation[];
    inventory: InventoryItem[];
    readOnly: boolean;
    assignButton: React.ReactNode;
    addProductButton: React.ReactNode;
    setTab: (key: TabKey) => void;
};

export function OverviewTab({
    stats,
    chart,
    performance,
    affectations,
    inventory,
    readOnly,
    assignButton,
    addProductButton,
    setTab,
}: OverviewTabProps) {
    const stockAlerts = inventory.filter((i) => i.stock_status !== 'normal');

    return (
        <div className="flex flex-col gap-6">
            <SitePerformance data={performance} linkHostesses={!readOnly} />

            <VisitsChart chart={chart} />

            <MetricStrip
                items={[
                    {
                        label: 'Visites totales',
                        value: stats.total_visits,
                    },
                    {
                        label: 'Durée moyenne',
                        value: formatDuration(stats.avg_duration, {
                            zeroIsEmpty: true,
                        }),
                        sub: 'par visite',
                    },
                    {
                        label: 'CA total',
                        value: `${compactAmount(stats.revenue_all_time)} FCFA`,
                    },
                    {
                        label: 'Rapports soumis',
                        value: stats.reports_submitted,
                    },
                ]}
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <Section
                    title="Équipe en poste"
                    actions={
                        affectations.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setTab('equipe')}
                                className="text-xs font-semibold text-motriks-deep hover:underline"
                            >
                                Gérer
                            </button>
                        )
                    }
                >
                    {affectations.length === 0 ? (
                        <EmptyState
                            icon={CalendarRange}
                            title="Aucune affectation"
                            description="Personne n'est encore affecté à ce site."
                            action={assignButton}
                        />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {affectations.slice(0, 4).map((a) => (
                                <li
                                    key={a.id}
                                    className="flex items-center gap-3 px-5 py-3"
                                >
                                    <Avatar name={a.agent_name} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink">
                                            {a.agent_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {a.slot_start && a.slot_end
                                                ? `${a.slot_start} – ${a.slot_end}`
                                                : `Depuis le ${a.starts_on}`}
                                        </p>
                                    </div>
                                    {a.is_current && (
                                        <StatusBadge tone="success">
                                            En poste
                                        </StatusBadge>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section
                    title="Stock à surveiller"
                    actions={
                        inventory.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setTab('inventaire')}
                                className="text-xs font-semibold text-motriks-deep hover:underline"
                            >
                                Voir l'inventaire
                            </button>
                        )
                    }
                >
                    {inventory.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title="Aucun produit suivi"
                            description="Ajoutez des produits à l'inventaire de ce site."
                            action={addProductButton}
                        />
                    ) : stockAlerts.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-500">
                            Tous les stocks sont au niveau normal.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {stockAlerts.slice(0, 4).map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center gap-3 px-5 py-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink">
                                            {item.product_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {item.current_stock}{' '}
                                            {item.product_unit} restant
                                            {item.current_stock > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                                            stockStyle[item.stock_status].chip,
                                        )}
                                    >
                                        {stockStyle[item.stock_status].label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>
        </div>
    );
}
