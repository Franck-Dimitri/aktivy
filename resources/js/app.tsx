import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Aktivy';

// Pages publiques affichées sans le layout de l'application
const PUBLIC_PAGES = ['welcome', 'landing', 'contact'];

// Dossiers de pages publiques (ex. legal/conditions, legal/confidentialite)
const PUBLIC_PREFIXES = ['legal/'];

const isPublicPage = (name: string) => PUBLIC_PAGES.includes(name) || PUBLIC_PREFIXES.some((prefix) => name.startsWith(prefix));

void createInertiaApp({
    title: (title) => (title ? title : appName),
    layout: (name) => {
        switch (true) {
            case isPublicPage(name):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('terrain/'):
                return AppLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#16a34a',
    },
});

// This will set light / dark mode on load...
initializeTheme();