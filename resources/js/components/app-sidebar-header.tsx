import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft, LogOut, Settings, User } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NotificationBell } from '@/components/notification-bell';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { useLogoutDialog } from '@/components/logout-dialog';
import { roleLabels } from '@/lib/navigation';
import { toUrl } from '@/lib/utils';
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
    const currentUrl = usePage().url;
    const { ask, dialog } = useLogoutDialog();
    // Page parente : le dernier élément du fil d'Ariane dont la page actuelle est une sous-page
    // (/sites pour /sites/1). Les pages de premier niveau gardent le logo.
    const currentPath = currentUrl.split('?')[0].replace(/\/$/, '');
    const parent =
        [...breadcrumbs].reverse().find((b) => {
            if (!b.href) return false;
            const path = toUrl(b.href).replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/\/$/, '');
            return path !== '' && path !== currentPath && currentPath.startsWith(`${path}/`);
        }) ?? null;

    return (
        <>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-card/85 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarToggle className="-ml-2 md:-ml-1.5" />
                {/* Téléphone (et application installée, sans bouton Retour du navigateur) : retour à la page parente */}
                {parent ? (
                    <Link
                        href={parent.href}
                        className="-ml-1 flex min-w-0 items-center gap-0.5 rounded-lg py-2 pr-2 text-sm font-semibold text-slate-700 transition-colors hover:text-ink md:hidden"
                        aria-label={`Retour : ${parent.title}`}
                    >
                        <ChevronLeft className="size-5 shrink-0 text-slate-400" />
                        <span className="truncate">{parent.title}</span>
                    </Link>
                ) : (
                    <div className="flex min-w-0 items-center gap-1 md:hidden">
                        <AppLogo />
                    </div>
                )}
                <div className="hidden min-w-0 md:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <p className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 lg:block">
                    {todayLabel()}
                </p>

                <NotificationBell />

                {auth.user && (
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex size-10 items-center justify-center rounded-full bg-motriks text-xs font-bold text-white shadow-sm md:size-9 shadow-green-600/25 ring-2 ring-transparent ring-offset-2 transition-all hover:ring-motriks/30 focus-visible:ring-motriks focus-visible:outline-none"
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
