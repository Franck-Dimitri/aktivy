import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

/** A back-office menu entry; one without `href` is not built yet. */
export type MenuItem = {
    title: string;
    icon: LucideIcon;
    href?: NonNullable<InertiaLinkProps['href']>;
    /** Module payant requis : sans lui, l'entrée est verrouillée (ou masquée pour les hôtesses). */
    module?: string;
    /** Entrée verrouillée : nom court du forfait qui la débloque (ex. « Pro »). */
    locked?: string;
};

export type MenuGroup = {
    label: string;
    items: MenuItem[];
};
