export type SiteType =
    | 'supermarche'
    | 'hypermarche'
    | 'epicerie'
    | 'pharmacie'
    | 'kiosque'
    | 'station_service'
    | 'boutique'
    | 'autre';

export type SiteStatus = 'active' | 'inactive' | 'suspended';

export type SiteListItem = {
    id: number;
    name: string;
    code: string | null;
    type: SiteType;
    type_label: string;
    city: string;
    region: string | null;
    status: SiteStatus;
    status_label: string;
    active_affectations_count: number;
    last_visit_at: string | null;
    has_coordinates: boolean;
};

export type SiteDetail = {
    id: number;
    name: string;
    code: string | null;
    type: SiteType;
    type_label: string;
    address: string | null;
    city: string;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    opening_time: string | null;
    closing_time: string | null;
    notes: string | null;
    status: SiteStatus;
    status_label: string;
    last_visit_at: string | null;
    photos: string[];
    photos_count: number;
};

export type SiteFormData = {
    id?: number;
    name: string;
    code: string | null;
    type: SiteType;
    address: string | null;
    city: string;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    opening_time: string | null;
    closing_time: string | null;
    notes: string | null;
    status?: SiteStatus;
};

export type SiteTypeOption = { value: SiteType; label: string };
export type SiteStatusOption = { value: SiteStatus; label: string };

export type SiteAffectation = {
    id: number;
    agent_id: number;
    agent_name: string;
    agent_phone: string | null;
    starts_on: string;
    ends_on: string | null;
    slot_start: string | null;
    slot_end: string | null;
    is_current: boolean;
};

export type SiteVisit = {
    id: number;
    agent_id: number;
    agent_name: string;
    checked_in_at: string;
    checked_out_at: string | null;
    duration_minutes: number | null;
    status: string;
    status_label: string;
};
