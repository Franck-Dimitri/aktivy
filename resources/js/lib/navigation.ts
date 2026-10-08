import {
    Building2,
    ClipboardCheck,
    CreditCard,
    FileBarChart,
    LayoutDashboard,
    MapPin,
    Package,
    ScrollText,
    Settings2,
    UserCog,
    Users,
    CalendarRange,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
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
                    ? [{ title: 'Activité du jour', icon: ClipboardCheck }]
                    : []),
                { title: 'Rapports', icon: FileBarChart },
            ],
        },
    ];

    if (manages) {
        groups.push({
            label: 'Équipe & terrain',
            items: [
                { title: 'Personnel', icon: Users },
                { title: 'Sites', icon: MapPin },
                { title: 'Affectations', icon: CalendarRange },
                { title: 'Produits & prix', icon: Package },
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
            ],
        });
    }

    return groups;
}
