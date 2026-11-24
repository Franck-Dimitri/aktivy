import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import MotriksLogo from '@/components/motriks-logo';
import { AuthCard, AuthHeading } from '@/components/auth/kit/auth-card';
import { TransitionLink } from '@/components/auth/kit/auth-transition';
import { AuthDivider, authOutlineButton } from '@/components/auth/kit/fields';
import { conditions, confidentialite, home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/** L'inscription, avec ses champs côte à côte, a une carte un peu plus large. */
const CARD_WIDTH: Record<string, number> = { 'auth/register': 460 };

/**
 * Pastille : la flèche, dans son rond, glisse vers la gauche au survol. « Accueil » sur téléphone.
 * Absente dans l'application installée, qui n'a pas de page d'accueil (comme une application mobile).
 */
function BackHome() {
    return (
        <Link
            href={home()}
            className="group flex h-10 items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pr-4 pl-1 text-sm font-semibold text-slate-700 transition-colors hover:border-green-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-offset-2 focus-visible:outline-none [@media(display-mode:standalone)]:hidden"
        >
            <span className="flex size-8 items-center justify-center rounded-full bg-motriks text-white transition-colors group-hover:bg-motriks-deep">
                <ArrowLeft className="size-4" />
            </span>
            <span className="sm:hidden">Accueil</span>
            <span className="hidden sm:inline">Retour à l’accueil</span>
        </Link>
    );
}

/**
 * Pages de connexion, inscription, mot de passe… : fond blanc, titre au-dessus d'une carte simple.
 * Volontairement léger (aucune animation JavaScript) : tout s'affiche dès le HTML du serveur.
 */
export default function AuthMotriksLayout({
    children,
    title,
    description,
    headerLink,
}: AuthLayoutProps) {
    const { component } = usePage();

    return (
        <>
            <div className="theme-light relative flex min-h-dvh flex-col overflow-x-hidden bg-white text-ink">
                <header className="relative z-10 flex items-center justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-5">
                    <Link
                        href={home()}
                        aria-label="Motriks, page d’accueil"
                        className="rounded-xl transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-offset-4 focus-visible:outline-none [@media(display-mode:standalone)]:pointer-events-none"
                    >
                        <MotriksLogo className="h-7 sm:h-8" />
                    </Link>
                    <BackHome />
                </header>

                <main className="relative z-10 flex flex-1 flex-col items-center justify-center py-6 sm:py-8">
                    <div className="w-full">
                        <AuthHeading title={title} description={description} />

                        <AuthCard width={CARD_WIDTH[component] ?? 420}>
                            {children}

                            {headerLink && (
                                <div className="mt-6 flex flex-col gap-5">
                                    <AuthDivider>
                                        {headerLink.text.replace(/\s*\?$/, '')}
                                    </AuthDivider>
                                    <TransitionLink
                                        href={headerLink.href}
                                        className={authOutlineButton}
                                    >
                                        {headerLink.label}
                                    </TransitionLink>
                                </div>
                            )}
                        </AuthCard>
                    </div>
                </main>

                <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 pb-6 text-xs text-slate-500">
                    <span>© {new Date().getFullYear()} Motriks</span>
                    <span aria-hidden="true">·</span>
                    <Link
                        href={conditions()}
                        className="transition-colors hover:text-slate-600"
                    >
                        Conditions
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link
                        href={confidentialite()}
                        className="transition-colors hover:text-slate-600"
                    >
                        Confidentialité
                    </Link>
                </footer>
            </div>
        </>
    );
}
