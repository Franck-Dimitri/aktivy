import { Link, usePage } from '@inertiajs/react';
import { ChevronsUpDown, LogOut, Settings, User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { roleLabels } from '@/lib/navigation';
import { useLogoutDialog } from '@/components/logout-dialog';
import { edit as profileEdit } from '@/routes/profile';

function initials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function NavUser() {
    const { auth } = usePage().props;
    const { state, setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();
    const { ask, dialog } = useLogoutDialog();

    if (!auth.user) {
        return null;
    }

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white data-[state=open]:bg-white/15 data-[state=open]:text-white"
                                data-test="sidebar-menu-button"
                            >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-green-700">
                                    {initials(auth.user.name)}
                                </span>
                                <div className="grid min-w-0 flex-1 text-left leading-tight">
                                    <span className="truncate text-sm font-semibold">{auth.user.name}</span>
                                    <span className="truncate text-xs text-green-100/80">
                                        {roleLabels[auth.user.role as keyof typeof roleLabels] ?? auth.user.role}
                                    </span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4 text-green-100/80" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl p-1.5"
                            align="end"
                            side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'top'}
                        >
                            <DropdownMenuItem asChild className="rounded-lg">
                                <Link href={profileEdit()} className="cursor-pointer" onClick={() => isMobile && setOpenMobile(false)}>
                                    <User className="mr-2 size-4" />
                                    Mon profil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg">
                                <Link href={profileEdit()} className="cursor-pointer" onClick={() => isMobile && setOpenMobile(false)}>
                                    <Settings className="mr-2 size-4" />
                                    Paramètres
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onSelect={ask}
                                className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600"
                            >
                                <LogOut className="mr-2 size-4" />
                                Se déconnecter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
            {dialog}
        </>
    );
}
