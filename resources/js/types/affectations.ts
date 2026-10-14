export type AffectationStatus = 'active' | 'completed' | 'cancelled';

export type AffectationListItem = {
    id: number;
    agent_id: number;
    agent_name: string;
    agent_role: string;
    agent_phone: string | null;
    site_id: number;
    site_name: string;
    site_city: string;
    site_type: string;
    starts_on: string;
    ends_on: string | null;
    slot_start: string | null;
    slot_end: string | null;
    status: AffectationStatus;
    status_label: string;
    is_current: boolean;
};

export type AffectationStats = {
    total: number;
    active: number;
    current: number;
    completed: number;
};

export type AffectationFormData = {
    site_id: number | '';
    user_id: number | '';
    starts_on: string;
    ends_on: string;
    slot_start: string;
    slot_end: string;
    notes: string;
    status?: string;
};

export type AffectationSelectOption = {
    value: number;
    label: string;
    role_label?: string;
    phone?: string | null;
};
