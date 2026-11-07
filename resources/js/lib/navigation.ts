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
    ScrollText,
    Palette,
    ShoppingCart,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminOnboarding } from '@/routes/admin/onboarding';
import { index as adminCompanies } from '@/routes/admin/companies';
import { index as adminAudit } from '@/routes/admin/audit';
import { index as adminSubscriptions } from '@/routes/admin/subscriptions';
import { index as adminSupport } from '@/routes/admin/support';
import { edit as companySettings } from '@/routes/company/settings';
import { subscription as companySubscription } from '@/routes/company';
import { index as companyImport } from '@/routes/company/import';
import { home as terrainHome, stats as terrainStats, planning as terrainPlanning, sales as terrainSales } from '@/routes/terrain';
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
import type { MenuGroup, Role } from '@/types';

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
 * Menu du rôle, sans les entrées des modules payants que l'entreprise n'a pas.
 */
export function menuFor(role: Role, modules: string[]): MenuGroup[] {
    return baseMenu(role)
        .map((g) => ({ ...g, items: g.items.filter((i) => !i.module || modules.includes(i.module)) }))
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
                ],
            },
            {
                label: 'Support',
                items: [
                    { title: 'Tickets', icon: MessageSquarePlus, href: terrainTickets().url, module: 'demandes' },
                ],
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
                    { title: 'Abonnements', icon: CreditCard, href: adminSubscriptions().url },
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
                ...(manages
                    ? [{ title: 'Activité du jour', icon: ClipboardCheck, href: activityIndex().url, module: 'terrain' }]
                    : []),
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
                { title: 'Mes données', icon: DatabaseBackup, href: dataExport() },
            ],
        });
    }

    return groups;
}
