import { type ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import MotriksLogo from '@/components/motriks-logo';

/* ------------------------------------------------------------------ */
/*  Petits composants                                                  */
/* ------------------------------------------------------------------ */

const ICON_PATHS = {
    field: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
    box: 'M21 8l-9-5-9 5m18 0v8l-9 5m9-13l-9 5m0 8l-9-5V8m9 13v-8M3 8l9 5',
    file: 'M7 3h7l5 5v13H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 0v5h5M9 13h6M9 17h6',
    coin: 'M12 6v12m3-9.5c-.5-1-1.600-1.500-3-1.500-1.700 0-3 .8-3 2s1.300 1.700 3 2 3 .8 3 2-1.300 2-3 2c-1.400 0-2.500-.5-3-1.500M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bell: 'M15 17h5l-1.400-1.400A2 2 0 0118 14.200V11a6 6 0 10-12 0v3.200a2 2 0 01-.6 1.400L4 17h5m6 0a3 3 0 11-6 0',
    camera: 'M4 8h3l2-3h6l2 3h3v11H4V8zm8 9a4 4 0 100-8 4 4 0 000 8z',
    chat: 'M21 12a8 8 0 01-11.500 7.200L4 20l1-4.500A8 8 0 1121 12z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    lock: 'M7 11V8a5 5 0 0110 0v3m-9 0h8a1 1 0 011 1v7a1 1 0 01-1 1H8a1 1 0 01-1-1v-7a1 1 0 011-1z',
    spark: 'M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900L12 3zm7 12l.8 2.200L22 18l-2.200.8L19 21l-.8-2.200L16 18l2.200-.8L19 15z',
    alert: 'M12 9v4m0 4h.01M10.300 3.900L1.800 18a2 2 0 001.700 3h17a2 2 0 001.700-3L13.700 3.900a2 2 0 00-3.400 0z',
    trend: 'M3 17l6-6 4 4 8-8m0 0h-6m6 0v6',
    mail: 'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm-1 1l9 6.500L21 7',
    offline:
        'M3 3l18 18M8.5 16.500a5 5 0 017 0M5 12.900a10 10 0 015.200-2.800M19 12.900a10 10 0 00-2.300-1.600M2 8.800a15 15 0 014.200-2.600M22 8.800A15 15 0 0010.700 5M12 20h.01',
    signal: 'M5 20v-3M10 20v-7M15 20V9M20 20V4',
    wallet: 'M3 7a2 2 0 012-2h12v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2zm13 7h.01',
    install:
        'M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zm4 4v7m-3-3l3 3 3-3m-3 6.500h.01',
};

export function Icon({
    name,
    className = 'h-6 w-6',
}: {
    name: string;
    className?: string;
}) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path d={ICON_PATHS[name as keyof typeof ICON_PATHS]} />
        </svg>
    );
}

export function Check({
    className = 'h-5 w-5 text-green-600',
}: {
    className?: string;
}) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path d="M5 13l4 4L19 7" />
        </svg>
    );
}

export function Cross({
    className = 'h-5 w-5 text-red-400',
}: {
    className?: string;
}) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

/* Logo Motriks horizontal : vert sur fond clair, blanc sur fond sombre (light). */
export function Logo({ light = false }: { light?: boolean }) {
    return (
        <Link
            href="/"
            aria-label="Motriks, accueil"
            className="flex items-center"
        >
            <MotriksLogo variant={light ? 'white' : 'color'} className="h-7" />
        </Link>
    );
}

/* Une seule taille pour tous les titres de section (h2) de la page, CTA final compris */
export const H2 =
    'text-balance text-3xl font-bold tracking-[-0.03em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]';

export function Eyebrow({
    children,
    dark = false,
}: {
    children: ReactNode;
    dark?: boolean;
}) {
    return (
        <p
            className={`mb-4 text-sm font-medium ${dark ? 'text-green-400' : 'text-green-700'}`}
        >
            {children}
        </p>
    );
}

/* En-tête de section : titre à gauche, texte à droite sur ordinateur, l'un sous l'autre sur téléphone */
export function SectionTitle({
    eyebrow,
    title,
    text,
    dark = false,
}: {
    eyebrow?: string;
    title: string;
    text?: string;
    dark?: boolean;
}) {
    return (
        <div
            data-reveal
            className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10"
        >
            <div className="lg:col-span-7">
                {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
                <h2
                    className={`${H2} ${dark ? 'text-white' : 'text-slate-950'}`}
                >
                    {title}
                </h2>
            </div>
            {text && (
                <p
                    className={`text-base leading-relaxed text-pretty sm:text-lg lg:col-span-5 lg:pb-1.5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}
                >
                    {text}
                </p>
            )}
        </div>
    );
}
