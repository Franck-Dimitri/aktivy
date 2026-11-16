import { Head, usePage } from '@inertiajs/react';
import { Eye, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import {
    SiteInventory,
    type InventoryItem,
} from '@/components/sites/site-inventory';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Page } from '@/components/page/page';
import { MetricStrip } from '@/components/page/surface';
import { dashboard } from '@/routes';
import { destroy as affectationDestroy } from '@/routes/affectations';
import { index as sitesIndex, destroy as siteDestroy } from '@/routes/sites';
import { destroy as inventoryDestroy } from '@/routes/sites/inventory';
import type { SiteAffectation } from '@/types';
import { EditSiteModal } from '@/pages/sites/edit-site-modal';
import { compactAmount } from '@/lib/format';
import { type Props, type AssignState } from '@/components/sites/show/types';
import { Section, Tabs } from '@/components/sites/show/ui';
import {
    InventoryAddModal,
    StockModal,
    RestockModal,
} from '@/components/sites/show/inventory-modals';
import { StockMovements } from '@/components/sites/show/stock-movements';
import { AssignModal } from '@/components/sites/show/assign-modal';
import { PhotoGallery } from '@/components/sites/show/photo-gallery';
import {
    useSiteTab,
    useEditSiteModal,
} from '@/components/sites/show/use-site-show';
import { SiteIdentity } from '@/components/sites/show/site-identity';
import { OverviewTab } from '@/components/sites/show/overview-tab';
import { TeamTab } from '@/components/sites/show/team-tab';
import { VisitsTab } from '@/components/sites/show/visits-tab';

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SiteShow({
    site,
    stats,
    chart,
    performance,
    affectations,
    recent_visits,
    hostess_history,
    available_staff,
    inventory,
    stock_movements,
    available_products,
    types,
    statuses,
}: Props) {
    // Supprimer un site : réservé au gérant. Modifier, affecter, gérer le stock : gérant et superviseur.
    // Le comptable consulte la fiche sans rien pouvoir modifier.
    const { manageCompany, manageTeam } = usePage().props.auth.can;
    const readOnly = !manageTeam;
    const hasStocks = usePage().props.auth.modules.includes('stocks');
    const [tab, setTab] = useSiteTab();
    const [assign, setAssign] = useState<AssignState>({ open: false });
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
    const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
    const { editingSite, setEditingSite, closeEditSite } =
        useEditSiteModal(readOnly);

    const deleteSite = useDeleteDialog<typeof site>({
        getUrl: (s) => siteDestroy(s.uuid).url,
        getTitle: (s) => `Supprimer « ${s.name} » ?`,
        getDescription: () =>
            'Les affectations et visites passées restent consultables.',
        getSuccessMessage: (s) => `« ${s.name} » a été supprimé.`,
        confirmLabel: 'Supprimer',
        icon: Trash2,
    });

    const removeInventory = useDeleteDialog<InventoryItem>({
        getUrl: (i) =>
            inventoryDestroy({ site: site.uuid, inventory: i.uuid }).url,
        getTitle: (i) => `Retirer « ${i.product_name} » ?`,
        getDescription: () =>
            "Le produit ne sera plus suivi dans l'inventaire de ce site.",
        getSuccessMessage: (i) =>
            `« ${i.product_name} » retiré de l'inventaire.`,
        confirmLabel: 'Retirer',
    });

    const removeAffectation = useDeleteDialog<SiteAffectation>({
        getUrl: (a) => affectationDestroy({ affectation: a.uuid }).url,
        getTitle: (a) => `Retirer ${a.agent_name} ?`,
        getDescription: () => 'Cette personne ne sera plus affectée à ce site.',
        getSuccessMessage: (a) => `${a.agent_name} a été retiré(e) du site.`,
        confirmLabel: 'Retirer',
    });

    const completionRate =
        stats.total_visits > 0
            ? Math.round((stats.completed_visits / stats.total_visits) * 100)
            : 0;
    const canAddPhoto = site.photos_count < 3;

    const openAssign = () => setAssign({ open: true, mode: 'assign' });

    const assignButton = readOnly ? undefined : (
        <ActionButton size="sm" icon={<Plus />} onClick={openAssign}>
            Affecter
        </ActionButton>
    );

    const addProductButton =
        !readOnly && available_products.length > 0 ? (
            <ActionButton
                size="sm"
                icon={<Plus />}
                onClick={() => setShowInventoryModal(true)}
            >
                Ajouter
            </ActionButton>
        ) : undefined;

    return (
        <>
            <Head title={site.name} />

            <Page
                title={site.name}
                description={[site.type_label, site.city, site.region]
                    .filter(Boolean)
                    .join(' · ')}
                actions={
                    readOnly ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ring-inset">
                            <Eye className="size-3.5" />
                            Consultation
                        </span>
                    ) : (
                        <>
                            <ActionButton
                                variant="secondary"
                                icon={<Pencil />}
                                onClick={() => setEditingSite(true)}
                            >
                                Modifier
                            </ActionButton>
                            {manageCompany && (
                                <ActionButton
                                    variant="secondary"
                                    icon={<Trash2 />}
                                    onClick={() => deleteSite.ask(site)}
                                    className="border-transparent bg-transparent text-red-600 shadow-none hover:bg-red-50"
                                >
                                    Supprimer
                                </ActionButton>
                            )}
                        </>
                    )
                }
            >
                <div className="flex flex-col gap-6">
                    {/* ───────────── Identité du site ───────────── */}
                    <SiteIdentity site={site} />

                    {/* ───────────── Chiffres clés du mois ───────────── */}
                    <MetricStrip
                        items={[
                            {
                                label: 'Visites ce mois-ci',
                                value: stats.visits_this_month,
                                sub: 'depuis le 1er',
                            },
                            {
                                label: "Chiffre d'affaires",
                                value: `${compactAmount(stats.revenue_this_month)} FCFA`,
                                sub: `${compactAmount(stats.revenue_all_time)} FCFA au total`,
                            },
                            {
                                label: 'Unités vendues',
                                value: stats.units_sold_this_month,
                                sub: 'ce mois-ci',
                            },
                            {
                                label: 'Taux de complétion',
                                value: (
                                    <span
                                        className={
                                            completionRate >= 80
                                                ? 'text-motriks-deep'
                                                : undefined
                                        }
                                    >
                                        {completionRate}%
                                    </span>
                                ),
                                sub: `${stats.completed_visits} visites complètes`,
                            },
                        ]}
                    />

                    {/* ───────────── Onglets ───────────── */}
                    <Tabs
                        active={tab}
                        onChange={setTab}
                        tabs={[
                            { key: 'apercu', label: 'Aperçu' },
                            {
                                key: 'equipe',
                                label: 'Équipe',
                                badge: affectations.length,
                            },
                            {
                                key: 'inventaire',
                                label: 'Inventaire',
                                badge: inventory.length,
                            },
                            { key: 'visites', label: 'Visites' },
                            {
                                key: 'photos',
                                label: 'Photos',
                                badge: `${site.photos_count}/3`,
                            },
                        ]}
                    />

                    {/* ───────────── Aperçu ───────────── */}
                    {tab === 'apercu' && (
                        <OverviewTab
                            stats={stats}
                            chart={chart}
                            performance={performance}
                            affectations={affectations}
                            inventory={inventory}
                            readOnly={readOnly}
                            assignButton={assignButton}
                            addProductButton={addProductButton}
                            setTab={setTab}
                        />
                    )}

                    {/* ───────────── Équipe ───────────── */}
                    {tab === 'equipe' && (
                        <TeamTab
                            affectations={affectations}
                            hostess_history={hostess_history}
                            readOnly={readOnly}
                            assignButton={assignButton}
                            setAssign={setAssign}
                            removeAffectation={removeAffectation}
                        />
                    )}

                    {/* ───────────── Inventaire ───────────── */}
                    {tab === 'inventaire' &&
                        (inventory.length === 0 ? (
                            <Section
                                title="Inventaire"
                                description="Le stock suivi sur ce site."
                                actions={addProductButton}
                            >
                                <EmptyState
                                    icon={Package}
                                    title="Aucun produit"
                                    description={
                                        readOnly
                                            ? 'Aucun produit n’est encore suivi sur ce site.'
                                            : 'Ajoutez des produits à suivre sur ce site.'
                                    }
                                    action={addProductButton}
                                />
                            </Section>
                        ) : (
                            <SiteInventory
                                items={inventory}
                                addButton={addProductButton}
                                readOnly={readOnly}
                                canRestock={hasStocks}
                                onRestock={setRestockItem}
                                onEdit={setStockItem}
                                onRemove={(item) => removeInventory.ask(item)}
                            />
                        ))}
                    {tab === 'inventaire' && hasStocks && (
                        <StockMovements movements={stock_movements} />
                    )}

                    {/* ───────────── Visites ───────────── */}
                    {tab === 'visites' && (
                        <VisitsTab recent_visits={recent_visits} />
                    )}

                    {/* ───────────── Photos ───────────── */}
                    {tab === 'photos' && (
                        <Section
                            title="Photos du site"
                            description="Jusqu'à 3 photos pour reconnaître le point de vente."
                            actions={
                                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                                    {site.photos_count}/3
                                </span>
                            }
                        >
                            <PhotoGallery
                                photos={site.photos ?? []}
                                siteUuid={site.uuid}
                                canAdd={!readOnly && canAddPhoto}
                                canDelete={!readOnly}
                            />
                        </Section>
                    )}
                </div>
            </Page>

            {editingSite && (
                <EditSiteModal
                    site={site}
                    types={types}
                    statuses={statuses}
                    onClose={closeEditSite}
                />
            )}
            {showInventoryModal && (
                <InventoryAddModal
                    siteUuid={site.uuid}
                    products={available_products}
                    onClose={() => setShowInventoryModal(false)}
                />
            )}
            {stockItem && (
                <StockModal
                    siteUuid={site.uuid}
                    item={stockItem}
                    onClose={() => setStockItem(null)}
                />
            )}
            {restockItem && (
                <RestockModal
                    siteUuid={site.uuid}
                    item={restockItem}
                    onClose={() => setRestockItem(null)}
                />
            )}
            {assign.open && (
                <AssignModal
                    modal={assign}
                    siteId={site.id}
                    staff={available_staff}
                    onClose={() => setAssign({ open: false })}
                />
            )}

            {deleteSite.dialog}
            {removeInventory.dialog}
            {removeAffectation.dialog}
        </>
    );
}

SiteShow.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};
