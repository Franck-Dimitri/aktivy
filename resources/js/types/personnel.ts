export type StaffRole = 'supervisor' | 'field_agent' | 'accountant';
export type AccountStatus = 'active' | 'suspended';

export type StaffListItem = {
    id: number;
    name: string;
    role: StaffRole;
    role_label: string;
    phone: string | null;
    status: AccountStatus;
    status_label: string;
    visits_count: number;
    on_site_now: string | null;
};

export type StaffMemberDetail = {
    id: number;
    name: string;
    role: StaffRole;
    role_label: string;
    phone: string | null;
    email: string | null;
    status: AccountStatus;
    status_label: string;
};

export type StaffStats = {
    total_visits: number;
    visits_30d: number;
    avg_duration: number;
    completed_visits: number;
};

export type StaffAffectation = {
    id: number;
    site_id: number;
    site_name: string;
    site_city: string;
    site_type: string;
    starts_on: string;
    ends_on: string | null;
    slot_start: string | null;
    slot_end: string | null;
    is_current: boolean;
};

export type StaffVisit = {
    id: number;
    site_name: string;
    checked_in_at: string;
    checked_out_at: string | null;
    duration_minutes: number | null;
    status: string;
    status_label: string;
};

export type RoleOption = {
    value: StaffRole;
    label: string;
};

export type StatusOption = {
    value: AccountStatus;
    label: string;
};

export type StaffFormData = {
    name: string;
    phone: string;
    email: string;
    role: StaffRole | string;
    password: string;
    password_confirmation: string;
};
