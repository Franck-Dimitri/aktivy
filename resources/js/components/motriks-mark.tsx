import { cn } from '@/lib/utils';

/**
 * Icône Motriks (radar) : cercles concentriques, secteur de balayage et point de détection.
 * Décorative : le nom « Motriks » est toujours affiché à côté.
 */
export default function MotriksMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" aria-hidden="true" className={cn('size-9 shrink-0', className)}>
            <rect width="100" height="100" rx="22" fill="#3B6D11" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="#C0DD97" strokeWidth="2" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="#C0DD97" strokeWidth="2" />
            <path d="M50 50 L50 16 A34 34 0 0 1 80 33 Z" fill="#639922" />
            <circle cx="68" cy="38" r="5" fill="#FFFFFF" />
            <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
        </svg>
    );
}
