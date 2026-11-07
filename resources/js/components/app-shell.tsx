import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    // Ordinateur : la page fait la hauteur de l’écran, sans défilement global (seul le panneau défile)
    return (
        <SidebarProvider defaultOpen={isOpen} className="md:h-svh md:overflow-hidden">
            {children}
        </SidebarProvider>
    );
}
