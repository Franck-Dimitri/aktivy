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
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function AppSidebar() {
    const { auth } = usePage().props;
    const groups = menuFor(auth.user.role);
    const home = groups[0].items[0].href ?? '/';
    const companyName = auth.company?.name ?? 'Motriks';
    const roleName = roleLabels[auth.user.role] ?? auth.user.role;

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
            {/* ── Logo ── */}
            <SidebarHeader className="p-0">
                <div className="flex h-14 items-center px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                asChild
                                className="h-auto rounded-xl p-2 hover:bg-white/10 active:bg-white/10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center"
                            >
                                <Link href={home} prefetch>
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[13px] font-black text-green-700 shadow shadow-green-950/20">
                                        M
                                    </span>
                                    <span className="text-[18px] font-extrabold tracking-tight text-white group-data-[collapsible=icon]:hidden">
                                        Motriks<span className="text-green-300">.</span>
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>

                {/* Bloc entreprise */}
                <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/20 text-[11px] font-bold text-white">
                        {companyInitials(companyName)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold leading-tight text-white">
                            {companyName}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-green-100/55">
                            {roleName}
                        </p>
                    </div>
                </div>

                <div className="mx-3 h-px bg-white/10 group-data-[collapsible=icon]:mx-2" />
            </SidebarHeader>

            {/* ── Navigation ── */}
            <SidebarContent className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <NavMain groups={groups} />
            </SidebarContent>

            {/* ── Footer ── */}
            <SidebarFooter className="p-0">
                <div className="mx-3 h-px bg-white/10 group-data-[collapsible=icon]:mx-2" />

                {/* Aide */}
                <div className="px-3 pt-1.5 group-data-[collapsible=icon]:px-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                aria-disabled
                                tooltip={{ children: 'Aide — bientôt disponible' }}
                                className="h-9 cursor-default rounded-xl px-3 text-[13px] text-green-100/35 hover:bg-transparent hover:text-green-100/35 aria-disabled:pointer-events-auto aria-disabled:opacity-100 [&>svg]:size-4 [&>svg]:text-green-100/30"
                            >
                                <LifeBuoy />
                                <span>Aide</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>

                <div className="mx-3 h-px bg-white/10 group-data-[collapsible=icon]:mx-2" />

                {/* Utilisateur */}
                <div className="p-3 group-data-[collapsible=icon]:p-2">
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
