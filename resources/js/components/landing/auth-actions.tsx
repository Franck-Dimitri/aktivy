import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, LayoutDashboard, LogOut, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/initials';
import { roleLabels } from '@/lib/navigation';
import { logout } from '@/routes';
import { edit as profileEdit } from '@/routes/profile';
import type { Auth } from '@/types';

/**
 * Boutons d'en-tête du site public. Visiteur : « Connexion » et « Essai gratuit ».
 * Connecté : « Mon espace » (tableau de bord de son rôle) et un menu avatar.
 * L'état vient des props Inertia du premier rendu : aucun clignotement.
 */
function useAuth() {
    const { auth } = usePage<{ auth?: Auth }>().props;
    return auth?.user ? { user: auth.user, home: auth.home ?? '/dashboard' } : null;
}

function AvatarMenu({ name, role }: { name: string; role: string }) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Mon compte"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white shadow-sm ring-2 ring-transparent ring-offset-2 transition hover:ring-green-600/30 focus-visible:ring-green-600 focus-visible:outline-none"
                >
                    {initials(name)}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                <DropdownMenuLabel className="px-2.5 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                    <p className="text-xs font-normal text-slate-500">{role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href={profileEdit()}>
                        <User className="size-4" />
                        Mon profil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600 [&_svg]:text-red-500">
                    <Link href={logout()} method="post" as="button" className="w-full">
                        <LogOut className="size-4" />
                        Se déconnecter
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** En-tête, écran large. */
export function AuthNavActions() {
    const auth = useAuth();

    if (!auth) {
        return (
            <div className="hidden items-center gap-1 xl:flex">
                <Link href="/login" className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                    Connexion
                </Link>
                <Link
                    href="/register"
                    className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700"
                >
                    Essai gratuit
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </Link>
            </div>
        );
    }

    return (
        <div className="hidden items-center gap-2 xl:flex">
            <Link
                href={auth.home}
                className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700"
            >
                <LayoutDashboard className="h-4 w-4" />
                Mon espace
            </Link>
            <AvatarMenu name={auth.user.name} role={roleLabels[auth.user.role] ?? auth.user.role} />
        </div>
    );
}

/** Menu mobile. */
export function AuthMobileActions() {
    const auth = useAuth();

    if (!auth) {
        return (
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                <Link href="/login" className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">
                    Connexion
                </Link>
                <Link href="/register" className="rounded-full bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-green-600/30">
                    Essai gratuit
                </Link>
            </div>
        );
    }

    return (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-3 px-2 py-1.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{initials(auth.user.name)}</span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{auth.user.name}</p>
                    <p className="text-xs text-slate-500">{roleLabels[auth.user.role] ?? auth.user.role}</p>
                </div>
            </div>
            <Link href={auth.home} className="flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-600/30">
                <LayoutDashboard className="h-4 w-4" />
                Mon espace
            </Link>
            <Link href={logout()} method="post" as="button" className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">
                Se déconnecter
            </Link>
        </div>
    );
}

/** Liens du pied de page : connexion / inscription, ou l'accès à son espace. */
export function useAccountLinks(): { label: string; href: string }[] {
    const auth = useAuth();
    return auth ? [{ label: 'Mon espace', href: auth.home }] : [
        { label: 'Connexion', href: '/login' },
        { label: 'Créer un compte', href: '/register' },
    ];
}
