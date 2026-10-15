import { Link, usePage } from '@inertiajs/react';
import { LifeBuoy } from 'lucide-react';
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

function companyInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function AppSidebar() {
    const { auth } = usePage().props;
    const groups = menuFor(auth.user.role);
    const home = groups[0].items[0].href;
    const companyName = auth.company?.name ?? 'Plateforme Aktivy';

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
            <SidebarHeader className="gap-5 p-4 group-data-[collapsible=icon]:p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-white/10 active:bg-white/10">
                            <Link href={home ?? '/'} prefetch>
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-green-700 shadow-lg shadow-green-950/20">
                                    A
                                </span>
                                <span className="text-xl font-extrabold tracking-tight text-white group-data-[collapsible=icon]:hidden">
                                    Aktivy<span className="text-green-200">.</span>
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-sm group-data-[collapsible=icon]:hidden">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-green-700">
                        {companyInitials(companyName)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{companyName}</p>
                        <p className="truncate text-xs text-green-100/80">{roleLabels[auth.user.role]}</p>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <NavMain groups={groups} />
            </SidebarContent>

            <SidebarFooter className="gap-2 p-3 group-data-[collapsible=icon]:px-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            aria-disabled
                            tooltip={{ children: 'Aide (bientôt disponible)' }}
                            className="h-10 cursor-default rounded-xl px-3 text-[13.5px] font-medium text-green-100/60 hover:bg-transparent hover:text-green-100/60 aria-disabled:pointer-events-auto aria-disabled:opacity-100 [&>svg]:size-[18px]"
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
