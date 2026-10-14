export type ProductListItem = {
    id: number;
    name: string;
    sku: string | null;
    description: string | null;
    unit: string;
    price: string | null;
    image_url: string | null;
    is_active: boolean;
    sites_count: number;
};

export type ProductStats = {
    total: number;
    active: number;
    inactive: number;
    deployed: number;
};

export type ProductFormData = {
    name: string;
    sku: string;
    description: string;
    unit: string;
    price: string;
    is_active: boolean;
    image?: File | null;
    remove_image?: boolean;
};

export type SiteInventoryItem = {
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string | null;
    product_unit: string;
    product_price: string | null;
    product_image_url: string | null;
    current_stock: number;
    alert_threshold: number;
    critical_threshold: number;
    stock_status: 'normal' | 'warning' | 'critical';
    updated_at: string;
};

export type ProductSelectOption = {
    value: number;
    label: string;
    unit: string;
};
