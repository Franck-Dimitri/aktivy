import { Link, usePage } from '@inertiajs/react';
import { Building2, LifeBuoy } from 'lucide-react';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { menuFor, roleLabels } from '@/lib/navigation';
import { help as helpRoute } from '@/routes';
import { show as onboardingShow } from '@/routes/onboarding';
import type { MenuGroup } from '@/types';
import MotriksLogo from '@/components/motriks-logo';
import MotriksMark from '@/components/motriks-mark';
import { initials } from '@/lib/initials';


function pendingMenu(normalGroups: MenuGroup[]): MenuGroup[] {
    return [
        {
            label: 'Mon compte',
            items: [{ title: 'Profil entreprise', icon: Building2, href: onboardingShow().url }],
        },
        ...normalGroups.map((g) => ({
            ...g,
            items: g.items.map((i) => ({ ...i, href: undefined })),
        })),
    ];
}

export function AppSidebar() {
    const { auth } = usePage().props;
    const { isMobile, setOpenMobile } = useSidebar();
    const isPending = auth.company?.status === 'pending' || auth.company?.status === 'rejected';
    const normalGroups = menuFor(auth.user.role, auth.modules);
    const groups = isPending ? pendingMenu(normalGroups) : normalGroups;
    const home = isPending ? onboardingShow().url : (groups[0].items[0].href ?? '/');
    const companyName = auth.company?.name ?? 'Motriks';
    const roleName = roleLabels[auth.user.role] ?? auth.user.role;

    return (
        <Sidebar collapsible="icon" variant="inset">
            {/* ── Logo ── */}
            <SidebarHeader className="p-0">
                <div className="flex h-14 items-center px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                asChild
                                className="h-auto rounded-xl p-2 hover:bg-sidebar-accent active:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-[10px] group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:hover:bg-transparent"
                            >
                                <Link href={home} prefetch aria-label="Motriks, tableau de bord" className="group/logo" onClick={() => isMobile && setOpenMobile(false)}>
                                    {/* Déplié : logo horizontal en blanc ; replié en icônes : le symbole seul */}
                                    <MotriksLogo variant="white" className="h-[26px] group-data-[collapsible=icon]:hidden" />
                                    <MotriksMark className="hidden size-8 rounded-[10px] shadow-sm shadow-black/15 ring-0 transition-transform duration-200 group-hover/logo:scale-105 group-data-[collapsible=icon]:flex" />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>

                {/* Bloc entreprise */}
                <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl bg-sidebar-accent px-3 py-2.5 group-data-[collapsible=icon]:hidden">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-[11px] font-bold text-sidebar-primary">
                        {initials(companyName)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold leading-tight text-sidebar-primary">
                            {companyName}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-sidebar-foreground/55">
                            {roleName}
                        </p>
                    </div>
                </div>

                <div className="mx-3 h-px bg-sidebar-border group-data-[collapsible=icon]:mx-2" />
            </SidebarHeader>

            {/* ── Navigation ── */}
            <SidebarContent className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <NavMain groups={groups} />
            </SidebarContent>

            {/* ── Footer ── */}
            <SidebarFooter className="p-0">
                <div className="mx-3 h-px bg-sidebar-border group-data-[collapsible=icon]:mx-2" />

                {/* Aide */}
                <div className="px-3 pt-1.5 group-data-[collapsible=icon]:px-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                tooltip={{ children: 'Aide' }}
                                className="h-9 rounded-xl px-3 text-[13px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:text-sidebar-foreground/70"
                            >
                                <Link href={helpRoute().url} onClick={() => isMobile && setOpenMobile(false)}>
                                    <LifeBuoy />
                                    <span>Aide</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>

                <div className="mx-3 h-px bg-sidebar-border group-data-[collapsible=icon]:mx-2" />

                {/* Utilisateur */}
                <div className="p-3 group-data-[collapsible=icon]:p-2">
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
