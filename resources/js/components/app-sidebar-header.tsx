import { Link, usePage } from '@inertiajs/react';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLogoutDialog } from '@/components/logout-dialog';
import { roleLabels } from '@/lib/navigation';
import { index as notificationsIndex } from '@/routes/notifications';
import { edit as profileEdit } from '@/routes/profile';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function todayLabel(): string {
    const d = new Date();
    return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function initials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth } = usePage().props;
    const { ask, dialog } = useLogoutDialog();

    return (
        <>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 dark:border-sidebar-border dark:bg-background/80">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1 shrink-0 text-slate-500 hover:bg-slate-100" />
                <div className="flex items-center gap-1 md:hidden">
                    <AppLogo />
                </div>
                <div className="hidden min-w-0 md:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <p className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 lg:block">
                    {todayLabel()}
                </p>

                <Link
                    href={notificationsIndex().url}
                    className="relative flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-motriks/40 focus-visible:outline-none"
                    aria-label={auth.unreadNotifications > 0 ? `Notifications (${auth.unreadNotifications} non lues)` : 'Notifications'}
                >
                    <Bell className="size-[18px]" />
                    {auth.unreadNotifications > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                            {auth.unreadNotifications > 9 ? '9+' : auth.unreadNotifications}
                        </span>
                    )}
                </Link>

                {auth.user && (
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex size-9 items-center justify-center rounded-full bg-motriks text-xs font-bold text-white shadow-sm shadow-green-600/25 ring-2 ring-transparent ring-offset-2 transition-all hover:ring-motriks/30 focus-visible:ring-motriks focus-visible:outline-none"
                                aria-label="Mon compte"
                            >
                                {initials(auth.user.name)}
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
                            <DropdownMenuLabel className="p-0">
                                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-motriks text-sm font-bold text-white">
                                        {initials(auth.user.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">{auth.user.name}</p>
                                        <p className="text-xs font-normal text-slate-500">
                                            {roleLabels[auth.user.role as keyof typeof roleLabels] ?? auth.user.role}
                                        </p>
                                    </div>
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild className="rounded-lg">
                                <Link href={profileEdit()} className="cursor-pointer">
                                    <User className="mr-2 size-4" />
                                    Mon profil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg">
                                <Link href={profileEdit()} className="cursor-pointer">
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
                )}
            </div>
        </header>
        {dialog}
        </>
    );
}
