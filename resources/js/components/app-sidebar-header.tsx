import { Link, router, usePage } from '@inertiajs/react';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { roleLabels } from '@/lib/navigation';
import { logout } from '@/routes';
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

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;

    const handleLogout = () => {
        router.flushAll();
    };

    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
            {/* Left — trigger + breadcrumbs */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1 shrink-0 text-slate-500" />
                <div className="flex items-center gap-1 md:hidden">
                    <AppLogo />
                </div>
                <div className="hidden min-w-0 md:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            {/* Right — date + bell + avatar */}
            <div className="flex shrink-0 items-center gap-3">
                {/* Date */}
                <p className="hidden text-xs text-slate-400 lg:block">{todayLabel()}</p>

                {/* Notification bell (placeholder) */}
                <button
                    className="relative flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Notifications"
                >
                    <Bell className="size-4" />
                </button>

                {/* User avatar dropdown */}
                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="flex size-8 items-center justify-center rounded-full bg-aktivy-soft text-aktivy-deep text-xs font-bold ring-2 ring-transparent transition-all hover:ring-aktivy/30 focus-visible:outline-none focus-visible:ring-aktivy"
                                aria-label="Mon compte"
                            >
                                {initials(auth.user.name)}
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-56 rounded-xl">
                            <DropdownMenuLabel className="p-0">
                                <div className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-aktivy-deep text-sm font-bold">
                                        {initials(auth.user.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {auth.user.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {roleLabels[auth.user.role as keyof typeof roleLabels] ?? auth.user.role}
                                        </p>
                                    </div>
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild>
                                <Link href={profileEdit()} className="cursor-pointer">
                                    <User className="mr-2 size-4" />
                                    Mon profil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={profileEdit()} className="cursor-pointer">
                                    <Settings className="mr-2 size-4" />
                                    Paramètres
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild>
                                <Link
                                    href={logout()}
                                    as="button"
                                    onClick={handleLogout}
                                    className="w-full cursor-pointer text-red-600 focus:text-red-600"
                                >
                                    <LogOut className="mr-2 size-4" />
                                    Se déconnecter
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
