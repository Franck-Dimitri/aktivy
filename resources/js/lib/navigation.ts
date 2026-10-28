import {
    Building2,
    CalendarRange,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    DatabaseBackup,
    FileBarChart,
    LayoutDashboard,
    MapPin,
    MessageSquarePlus,
    Package,
    PackageX,
    ScrollText,
    Settings2,
    ShoppingCart,
    TrendingUp,
    UserCog,
    Users,
    Zap,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminOnboarding } from '@/routes/admin/onboarding';
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
export function menuFor(role: Role): MenuGroup[] {
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
                    { title: 'Tickets', icon: MessageSquarePlus, href: terrainTickets().url },
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
                    { title: 'Entreprises', icon: Building2 },
                    { title: 'Abonnements', icon: CreditCard },
                    { title: 'Journal d’audit', icon: ScrollText },
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
                    ? [{ title: 'Activité du jour', icon: ClipboardCheck, href: activityIndex().url }]
                    : []),
                { title: 'Rapports journaliers', icon: ClipboardList, href: dailyReportsIndex().url },
                { title: 'Ventes & objectifs', icon: FileBarChart, href: reportsIndex() },
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
                // Catalogue et événements concernent toute l'entreprise : réservés au gérant
                ...(role === 'company_admin'
                    ? [
                          { title: 'Produits & prix', icon: Package, href: productsIndex().url },
                          { title: 'Événements', icon: Zap, href: eventsIndex().url },
                      ]
                    : []),
                { title: 'Alertes de stock', icon: PackageX, href: stockAlertsIndex().url },
                { title: 'Tickets', icon: MessageSquarePlus, href: ticketsIndex().url },
            ],
        });
    }

    if (role === 'company_admin') {
        groups.push({
            label: 'Entreprise',
            items: [
                { title: 'Paramètres', icon: Settings2 },
                { title: 'Utilisateurs', icon: UserCog },
                { title: 'Abonnement', icon: CreditCard },
                { title: 'Mes données', icon: DatabaseBackup, href: dataExport() },
            ],
        });
    }

    return groups;
}
