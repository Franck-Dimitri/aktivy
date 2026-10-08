import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border bg-white/90 px-4 backdrop-blur sm:px-6 dark:bg-background/90">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1 text-slate-500" />
                <div className="flex items-center gap-1 md:hidden">
                    <AppLogo />
                </div>
                <div className="hidden md:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>
        </header>
    );
}
