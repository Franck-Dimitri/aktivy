export type TabId = 'apercu' | 'pdv' | 'packs' | 'hotesses' | 'ventes';

export type EventSite = {
    id: number;
    name: string;
    address: string | null;
    city: string | null;
    site_id: number | null;
    hostesses_count: number;
};

export type PackLine = {
    id: number;
    product_id: number;
    product: { id: number; name: string; image: string | null };
    quantity: number;
    role: 'paid' | 'free';
    unit_price: number | null;
};

export type EventPack = {
    id: number;
    name: string;
    description: string | null;
    type: 'grouped_discount' | 'buy_get_free';
    type_label: string;
    price: number | null;
    active: boolean;
    lines: PackLine[];
};

export type EventHostess = {
    id: number;
    user_id: number;
    name: string;
    phone: string | null;
    status: 'active' | 'archived';
    recruited_for_event: boolean;
    event_site_id: number | null;
    site_name: string | null;
};

export type CompanySite    = { id: number; name: string; city: string; address: string | null };
export type CompanyProduct = { id: number; name: string; image: string | null };
export type AvailableHostess = { id: number; name: string; phone: string | null };

export type EventSalesPdv = {
    id: number;
    name: string;
    revenue: number;
    units_sold: number;
    reports_count: number;
};
export type EventSalesProduct = { name: string; revenue: number; units_sold: number };
export type EventSales = {
    revenue: number;
    units_sold: number;
    reports_count: number;
    by_pdv: EventSalesPdv[];
    by_product: EventSalesProduct[];
};

export type EventData = {
    id: number;
    name: string;
    description: string | null;
    status: 'draft' | 'active' | 'completed' | 'archived';
    status_label: string;
    status_color: string;
    start_date: string;
    end_date: string;
    location: string | null;
    city: string;
    activated_at: string | null;
    sites: EventSite[];
    packs: EventPack[];
    hostesses: EventHostess[];
};

export type ShowProps = {
    event: EventData;
    companySites: CompanySite[];
    companyProducts: CompanyProduct[];
    availableHostesses: AvailableHostess[];
    eventSales: EventSales;
};

export const STATUS_TONE: Record<string, 'warning' | 'success' | 'info' | 'neutral'> = {
    draft:     'warning',
    active:    'success',
    completed: 'info',
    archived:  'neutral',
};

export function formatMoney(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
}
