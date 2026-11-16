import {
    Building2,
    Fuel,
    Pill,
    Shirt,
    ShoppingBasket,
    ShoppingCart,
    Store,
    Warehouse,
    type LucideIcon,
} from 'lucide-react';
import { type InventoryItem } from '@/components/sites/site-inventory';
import { type StatusTone } from '@/components/page/status-badge';
import { type TabKey, type Period } from '@/components/sites/show/types';

/* -------------------------------------------------------------------------- */
/*  Constantes et utilitaires                                                 */
/* -------------------------------------------------------------------------- */

const TAB_KEYS: TabKey[] = [
    'apercu',
    'equipe',
    'inventaire',
    'visites',
    'photos',
];

export const PERIOD_LABELS: Record<Period, string> = {
    week: '7 jours',
    month: '30 jours',
    year: '12 mois',
};

export const statusTone: Record<string, StatusTone> = {
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
};

export const typeIcon: Record<string, LucideIcon> = {
    supermarche: ShoppingCart,
    hypermarche: Warehouse,
    epicerie: ShoppingBasket,
    pharmacie: Pill,
    kiosque: Store,
    station_service: Fuel,
    boutique: Shirt,
    autre: Building2,
};

export const stockStyle: Record<
    InventoryItem['stock_status'],
    { chip: string; bar: string; label: string }
> = {
    normal: {
        chip: 'bg-green-50 text-green-700 ring-green-600/15',
        bar: 'bg-green-500',
        label: 'Normal',
    },
    warning: {
        chip: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        bar: 'bg-amber-400',
        label: 'Alerte',
    },
    critical: {
        chip: 'bg-red-50 text-red-700 ring-red-600/15',
        bar: 'bg-red-500',
        label: 'Critique',
    },
};

export function tabFromHash(): TabKey {
    if (typeof window === 'undefined') return 'apercu';
    const hash = window.location.hash.replace('#', '') as TabKey;
    return TAB_KEYS.includes(hash) ? hash : 'apercu';
}
