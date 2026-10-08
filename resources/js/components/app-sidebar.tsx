import { Link, usePage } from '@inertiajs/react';
import { LifeBuoy } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { menuFor, roleLabels } from '@/lib/navigation';

export function AppSidebar() {
    const { auth } = usePage().props;
    const groups = menuFor(auth.user.role);
    const home = groups[0].items[0].href;

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="gap-3 px-3 pt-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-transparent"
                        >
                            <Link href={home ?? '/'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="rounded-xl border border-sidebar-border bg-slate-50 px-3 py-2.5 group-data-[collapsible=icon]:hidden dark:bg-sidebar-accent">
                    <p className="truncate text-sm font-semibold text-ink dark:text-white">
                        {auth.company?.name ?? 'Plateforme Aktivy'}
                    </p>
                    <p className="text-xs text-slate-500">
                        {roleLabels[auth.user.role]}
                    </p>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={groups} />
            </SidebarContent>

            <SidebarFooter className="gap-1 px-3 pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            aria-disabled
                            tooltip={{ children: 'Aide (bientôt disponible)' }}
                            className="h-9 cursor-default rounded-lg px-2.5 text-[13.5px] font-medium text-slate-400 hover:bg-transparent hover:text-slate-400 aria-disabled:pointer-events-auto aria-disabled:opacity-100 [&>svg]:size-[18px]"
                        >
                            <LifeBuoy />
                            <span>Aide</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
