import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { InstallPrompt } from '@/components/install-prompt';
import { NoSiteBanner } from '@/components/no-site-banner';
import { OfflineSync } from '@/components/offline-sync';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-clip bg-slate-100 dark:bg-background"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <NoSiteBanner />
                <OfflineSync />
                {/* Téléphone : installer l'application, puis activer les notifications */}
                <InstallPrompt />
                {children}
            </AppContent>
        </AppShell>
    );
}
