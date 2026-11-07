import { cn } from '@/lib/utils';

/**
 * Logo Motriks horizontal (symbole + nom).
 * - `color` : vert, pour les fonds clairs (connexion, site public, en-tête mobile)
 * - `white` : blanc, pour la barre latérale verte et les fonds sombres
 * La hauteur se règle avec className (« h-7 » par défaut), la largeur suit.
 */
export default function MotriksLogo({ variant = 'color', className }: { variant?: 'color' | 'white'; className?: string }) {
    return (
        <img
            src="/images/logos/motriks-logo.svg"
            alt="Motriks"
            width={1212}
            height={186.5}
            draggable={false}
            className={cn('h-7 w-auto shrink-0 select-none', variant === 'white' && 'brightness-0 invert', className)}
        />
    );
}
