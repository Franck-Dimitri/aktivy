import { type ReportPhoto } from '@/components/report-photos';
import { type ExternalShopSales } from '@/components/external-sales';
import { type ExternalProduct } from '@/components/terrain/external-sales-editor';

/* Rapport journalier de l’hôtesse : types partagés et mise en forme. */

/* ─── Types ─── */

export type ReportLine = {
    /** Numéro de la ligne ; provisoire (négatif) pour un rapport ouvert hors ligne avant la prise de service reçue */
    id: number;
    /** Produit du point de vente : repère stable de la ligne, avec ou sans réseau */
    site_product_id?: number;
    product_name: string;
    unit: string;
    unit_price: number;
    opening_stock: number;
    /** Unités vendues à l'unité (saisie de l'hôtesse) ; les packs s'y ajoutent. */
    units_sold: number;
    pack_units: number;
    /** Unités livrées pendant le service : elles s'ajoutent au stock d'ouverture. */
    restocked: number;
    stock_gap: number;
    gap_reason: string | null;
    closing_stock: number;
    revenue: number;
    notes: string | null;
    image_url: string | null;
};

/** Pack de l'événement en cours, avec les produits du site qu'il consomme. */
export type PackOffer = {
    id: number;
    name: string;
    value: number;
    quantity: number;
    items: {
        line_id: number | null;
        name: string;
        quantity: number;
        free: boolean;
    }[];
};

export type Report = {
    id: number;
    status: 'draft' | 'submitted';
    report_date: string;
    site_name: string;
    notes: string | null;
    incident_notes: string | null;
    submitted_at: string | null;
    total_revenue: number;
    total_units_sold: number;
    validated: boolean;
    corrected: boolean;
    lines: ReportLine[];
    packs: PackOffer[];
    /** Ventes en boutique extérieure : mêmes produits, mêmes prix, hors stock du point de vente. */
    external_sales: ExternalShopSales[];
    external_products: ExternalProduct[];
    external_shops: string[];
    photos: ReportPhoto[];
    max_photos: number;
};

export type VisitInfo = {
    id: number;
    uuid: string;
    checked_in_at: string;
    checked_out_at: string | null;
    status: string;
};

export type Busy = 'draft' | 'submit' | 'flag' | 'checkout' | null;
export type Step = 'edit' | 'review' | 'incident';

/* ─── Mise en page : contenu principal + panneau latéral ─── */

export const twoCol =
    'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]';

/* ─── Formatters ─── */

export function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
