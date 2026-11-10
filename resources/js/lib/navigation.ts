import {
    Building2,
    CalendarRange,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    LifeBuoy,
    DatabaseBackup,
    FileBarChart,
    FileUp,
    LayoutDashboard,
    MapPin,
    MessageSquarePlus,
    Package,
    PackageX,
    Receipt,
    ScrollText,
    Palette,
    ShoppingCart,
    Store,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminOnboarding } from '@/routes/admin/onboarding';
import { index as adminCompanies } from '@/routes/admin/companies';
import { index as adminUsers } from '@/routes/admin/users';
import { index as adminAudit } from '@/routes/admin/audit';
import { index as adminSubscriptions } from '@/routes/admin/subscriptions';
import { index as adminSupport } from '@/routes/admin/support';
import { index as adminInvoices } from '@/routes/admin/invoices';
import { edit as companySettings } from '@/routes/company/settings';
import { subscription as companySubscription } from '@/routes/company';
import { index as companyInvoices } from '@/routes/company/invoices';
import { index as companyImport } from '@/routes/company/import';
import {
    externalShops as terrainExternalShops,
    home as terrainHome,
    planning as terrainPlanning,
    sales as terrainSales,
    stats as terrainStats,
    stock as terrainStock,
} from '@/routes/terrain';
import { index as terrainReports } from '@/routes/terrain/reports';
import { index as terrainTickets } from '@/routes/terrain/tickets';
import { index as sitesIndex } from '@/routes/sites';
import { index as personnelIndex } from '@/routes/personnel';
import { index as affectationsIndex } from '@/routes/affectations';
import { index as productsIndex } from '@/routes/products';
import { index as reportsIndex } from '@/routes/reports';
import { index as dailyReportsIndex } from '@/routes/daily-reports';
import { dataExport } from '@/routes/company';
import { index as eventsIndex } from '@/routes/events';
import { index as ticketsIndex } from '@/routes/tickets';
import { index as activityIndex } from '@/routes/activity';
import { index as stockAlertsIndex } from '@/routes/stock-alerts';
import type { MenuGroup, MenuItem, Role } from '@/types';

export const roleLabels: Record<Role, string> = {
    super_admin: 'Super administrateur',
    company_admin: 'Gérant',
    supervisor: 'Superviseur',
    field_agent: 'Hôtesse',
    accountant: 'Comptable',
};

/**
 * The back-office menu of each role, as defined in docs/CARTE_APP.md.
 * Pages that are not built yet have no `href` and show as "Bientôt".
 */
/**
 * Menu du rôle. Les modules payants que l'entreprise n'a pas restent visibles avec un cadenas et le
 * forfait qui les débloque (modèle freemium : on montre ce qu'on peut débloquer) ; la page ouverte
 * explique alors comment y accéder. Les hôtesses, qui ne choisissent pas le forfait, ne les voient pas.
 */
export function menuFor(role: Role, modules: string[], locked: Record<string, string> = {}): MenuGroup[] {
    const included = (i: MenuItem) => !i.module || modules.includes(i.module);

    return baseMenu(role)
        .map((g) => ({
            ...g,
            items:
                role === 'field_agent'
                    ? g.items.filter(included)
                    : g.items.map((i) => (included(i) ? i : { ...i, locked: locked[i.module!] ?? 'Pro' })),
        }))
        .filter((g) => g.items.length > 0);
}

function baseMenu(role: Role): MenuGroup[] {
    if (role === 'field_agent') {
        return [
            {
                label: 'Mon espace',
                items: [
                    { title: 'Tableau de bord', icon: LayoutDashboard, href: terrainHome().url },
                    { title: 'Mes statistiques', icon: TrendingUp, href: terrainStats().url },
                ],
            },
            {
                label: 'Terrain',
                items: [
                    { title: 'Mes rapports', icon: ClipboardList, href: terrainReports().url },
                    { title: 'Mon planning', icon: CalendarRange, href: terrainPlanning().url },
                    { title: 'Mes ventes', icon: ShoppingCart, href: terrainSales().url },
                    { title: 'Boutiques extérieures', icon: Store, href: terrainExternalShops().url },
                    { title: 'Mon stock', icon: Package, href: terrainStock().url },
                ],
            },
            {
                label: 'Support',
                items: [{ title: 'Tickets', icon: MessageSquarePlus, href: terrainTickets().url, module: 'demandes' }],
            },
        ];
    }

    if (role === 'super_admin') {
        return [
            {
                label: 'Plateforme',
                items: [
                    {
                        title: 'Tableau de bord',
                        icon: LayoutDashboard,
                        href: adminDashboard(),
                    },
                    {
                        title: 'Demandes d’inscription',
                        icon: ClipboardCheck,
                        href: adminOnboarding(),
                    },
                    { title: 'Entreprises', icon: Building2, href: adminCompanies().url },
                    { title: 'Utilisateurs', icon: Users, href: adminUsers().url },
                    { title: 'Abonnements', icon: CreditCard, href: adminSubscriptions().url },
                    { title: 'Factures', icon: Receipt, href: adminInvoices().url },
                    { title: 'Support', icon: LifeBuoy, href: adminSupport().url },
                    { title: 'Journal d’audit', icon: ScrollText, href: adminAudit().url },
                ],
            },
        ];
    }

    const manages = role === 'company_admin' || role === 'supervisor';

    const groups: MenuGroup[] = [
        {
            label: 'Pilotage',
            items: [
                {
                    title: 'Tableau de bord',
                    icon: LayoutDashboard,
                    href: dashboard(),
                },
                ...(manages ? [{ title: 'Activité du jour', icon: ClipboardCheck, href: activityIndex().url, module: 'terrain' }] : []),
                { title: 'Rapports journaliers', icon: ClipboardList, href: dailyReportsIndex().url, module: 'terrain' },
                { title: 'Ventes & objectifs', icon: FileBarChart, href: reportsIndex(), module: 'reporting' },
            ],
        },
    ];

    if (manages) {
        groups.push({
            label: 'Équipe & terrain',
            items: [
                { title: 'Personnel', icon: Users, href: personnelIndex().url },
                { title: 'Sites', icon: MapPin, href: sitesIndex().url },
                { title: 'Affectations', icon: CalendarRange, href: affectationsIndex().url },
                { title: 'Produits & prix', icon: Package, href: productsIndex().url },
                // Les événements concernent toute l'entreprise : réservés au gérant
                ...(role === 'company_admin' ? [{ title: 'Événements', icon: Zap, href: eventsIndex().url, module: 'events' }] : []),
                { title: 'Alertes de stock', icon: PackageX, href: stockAlertsIndex().url, module: 'stocks' },
                { title: 'Tickets', icon: MessageSquarePlus, href: ticketsIndex().url, module: 'demandes' },
            ],
        });
    }

    if (role === 'company_admin') {
        groups.push({
            label: 'Entreprise',
            items: [
                { title: 'Identité & marque', icon: Palette, href: companySettings().url },
                { title: 'Importer des fichiers', icon: FileUp, href: companyImport().url },
                { title: 'Abonnement', icon: CreditCard, href: companySubscription().url },
                { title: 'Factures', icon: Receipt, href: companyInvoices().url },
                { title: 'Mes données', icon: DatabaseBackup, href: dataExport() },
            ],
        });
    }

    return groups;
}
