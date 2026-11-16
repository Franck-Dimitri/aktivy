import { type InventoryItem } from '@/components/sites/site-inventory';
import { type SitePerformanceData } from '@/components/sites/site-performance';
import type {
    SiteAffectation,
    SiteDetail,
    SiteStatusOption,
    SiteTypeOption,
    SiteVisit,
} from '@/types';

/* Fiche d’un site : types partagés par la page et ses sections. */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ChartPoint = { label: string; count: number };
export type ChartData = {
    week: ChartPoint[];
    month: ChartPoint[];
    year: ChartPoint[];
};

export type SiteStats = {
    total_visits: number;
    visits_this_month: number;
    avg_duration: number;
    completed_visits: number;
    revenue_all_time: number;
    revenue_this_month: number;
    units_sold_this_month: number;
    reports_submitted: number;
};

export type HostessRecord = {
    agent_id: number;
    agent_uuid: string;
    agent_name: string;
    agent_phone: string | null;
    role_label: string;
    visit_count: number;
    first_date: string;
    last_date: string;
    is_current: boolean;
};

export type StaffOption = { value: number; label: string; role_label: string };

export type ProductOption = { value: number; label: string; unit: string };

export type StockMovementItem = {
    id: number;
    date: string;
    product_name: string | null;
    type:
        | 'initial'
        | 'restock'
        | 'sale'
        | 'adjustment'
        | 'correction'
        | 'closing_gap';
    type_label: string;
    quantity: number;
    stock_after: number;
    author: string | null;
    notes: string | null;
    daily_report_id: number | null;
    daily_report_uuid: string | null;
};

export type Props = {
    site: SiteDetail & {
        photos: string[];
        photos_count: number;
    };
    stats: SiteStats;
    chart: ChartData;
    performance: SitePerformanceData;
    affectations: SiteAffectation[];
    recent_visits: SiteVisit[];
    hostess_history: HostessRecord[];
    available_staff: StaffOption[];
    inventory: InventoryItem[];
    stock_movements: StockMovementItem[];
    available_products: ProductOption[];
    types: SiteTypeOption[];
    statuses: SiteStatusOption[];
};

export type AssignState =
    | { open: false }
    | { open: true; mode: 'assign' }
    | {
          open: true;
          mode: 'permuter';
          replacingUuid: string;
          replacingName: string;
      };

export type TabKey = 'apercu' | 'equipe' | 'inventaire' | 'visites' | 'photos';
export type Period = 'week' | 'month' | 'year';
