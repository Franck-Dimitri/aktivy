export type Role =
    | 'super_admin'
    | 'company_admin'
    | 'supervisor'
    | 'field_agent'
    | 'accountant';

export type User = {
    id: number;
    company_id: number | null;
    role: Role;
    name: string;
    email: string | null;
    phone: string | null;
    must_change_password: boolean;
    avatar?: string;
    email_verified_at: string | null;
    /* @chisel-2fa */
    two_factor_enabled?: boolean;
    /* @end-chisel-2fa */
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Company = {
    id: number;
    name: string;
    logo_path: string | null;
    primary_color: string | null;
};

export type Auth = {
    user: User;
    company: Company | null;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

/* @chisel-2fa */
export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
/* @end-chisel-2fa */
