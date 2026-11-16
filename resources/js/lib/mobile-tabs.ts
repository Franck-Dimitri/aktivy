import {
    ClipboardList,
    House,
    Package,
    ShoppingCart,
    type LucideIcon,
} from 'lucide-react';
import {
    home as terrainHome,
    sales as terrainSales,
    stock as terrainStock,
} from '@/routes/terrain';
import { index as terrainReports } from '@/routes/terrain/reports';
import type { Role } from '@/types';

/**
 * Barre d'onglets en bas de l'écran (téléphone), comme dans une application mobile. Pour l'hôtesse :
 * les quatre écrans de sa journée, et « Plus » qui ouvre le menu complet (statistiques, planning,
 * boutiques extérieures, tickets, profil).
 */
export type MobileTab = {
    title: string;
    icon: LucideIcon;
    href: string;
    /** Adresses qui allument l'onglet en plus de la sienne (ex. : l'historique des rapports et ses filtres). */
    matches: (path: string) => boolean;
};

const path = (url: string) => url.split(/[?#]/)[0].replace(/\/$/, '') || '/';

export function mobileTabsFor(role: Role | undefined): MobileTab[] {
    if (role !== 'field_agent') {
        return [];
    }

    const home = path(terrainHome().url);
    const reports = path(terrainReports().url);
    const sales = path(terrainSales().url);
    const stock = path(terrainStock().url);

    return [
        {
            title: 'Accueil',
            icon: House,
            href: home,
            matches: (p) => p === home,
        },
        {
            title: 'Rapports',
            icon: ClipboardList,
            href: reports,
            matches: (p) => p === reports || p.startsWith(`${reports}/`),
        },
        {
            title: 'Ventes',
            icon: ShoppingCart,
            href: sales,
            matches: (p) => p === sales,
        },
        {
            title: 'Stock',
            icon: Package,
            href: stock,
            matches: (p) => p === stock,
        },
    ];
}

/**
 * Écrans où la barre se retire : la saisie du rapport a sa propre barre d'action en bas,
 * l'hôtesse s'y concentre sur une tâche (comme un écran de détail dans une application).
 */
const FOCUS_SCREENS = [/^\/terrain\/rapport\//];

export function showsMobileTabs(role: Role | undefined, url: string): boolean {
    const current = path(url);

    return (
        mobileTabsFor(role).length > 0 &&
        !FOCUS_SCREENS.some((pattern) => pattern.test(current))
    );
}

export function currentPath(url: string): string {
    return path(url);
}
