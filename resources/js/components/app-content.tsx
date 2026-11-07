import * as React from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { AppVariant } from '@/types';

type Props = React.ComponentProps<'main'> & {
    variant?: AppVariant;
};

/**
 * Contenu principal. Avec la barre latérale : panneau surélevé posé sur le fond de la page
 * (couleur de la barre latérale), coins de 16 px, marge de 8 px en haut, à droite et en bas.
 * Sur ordinateur, c'est lui qui défile (la page fait 100 % de la hauteur) ; sur téléphone,
 * il prend tout l'écran sans marge ni arrondi et la page défile normalement.
 */
export function AppContent({ variant = 'sidebar', children, className, ...props }: Props) {
    if (variant === 'sidebar') {
        return (
            <SidebarInset
                // Inertia remet ce panneau en haut à chaque page (et le garde en place avec preserveScroll)
                {...{ 'scroll-region': '' }}
                className={cn(
                    'bg-card',
                    // Pas de barre de défilement visible : elle cassait l'arrondi du coin droit (on défile à la molette, au doigt, au clavier)
                    '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    'md:peer-data-[variant=inset]:h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:overflow-y-auto md:peer-data-[variant=inset]:overscroll-contain',
                    'md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border/60 md:peer-data-[variant=inset]:shadow-md',
                    className,
                )}
                {...props}
            >
                {children}
            </SidebarInset>
        );
    }

    return (
        <main className={cn('mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl', className)} {...props}>
            {children}
        </main>
    );
}
