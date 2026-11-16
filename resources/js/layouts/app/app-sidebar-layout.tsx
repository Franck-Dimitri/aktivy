import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ConnectionStatus } from '@/components/connection-status';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { InstallPrompt } from '@/components/install-prompt';
import { MobileTabBar } from '@/components/mobile-tab-bar';
import { NoSiteBanner } from '@/components/no-site-banner';
import { OfflineSync } from '@/components/offline-sync';
import { PullToRefresh } from '@/components/pull-to-refresh';
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
                className="min-w-0 overflow-x-clip"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <ImpersonationBanner />
                <NoSiteBanner />
                {/* Sans réseau : hôtesse, son travail hors ligne ; responsables, la bannière de connexion */}
                <OfflineSync />
                <ConnectionStatus />
                {/* Téléphone : installer l'application, puis activer les notifications */}
                <InstallPrompt />
                {/* Application installée : tirer vers le bas, tout en haut de la page, recharge ses données */}
                <PullToRefresh />
                {children}
                {/* Téléphone : onglets en bas de l'écran (hôtesse) */}
                <MobileTabBar />
            </AppContent>
        </AppShell>
    );
}
