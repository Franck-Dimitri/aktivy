import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import MotriksLogo from '@/components/motriks-logo';
import { AuthCard, AuthHeading, EASE, StaggerItem } from '@/components/auth/kit/auth-card';
import { AuthTransitionProvider, TransitionLink, useAuthTransitionController } from '@/components/auth/kit/auth-transition';
import { AuthDivider, authOutlineButton } from '@/components/auth/kit/fields';
import { conditions, confidentialite, home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/** Connexion et inscription font arriver chaque champ en cascade ; les autres pages, d'un bloc. */
const CASCADING = ['auth/login', 'auth/register'];

/** L'inscription, avec ses champs côte à côte, a une carte un peu plus large. */
const CARD_WIDTH: Record<string, number> = { 'auth/register': 460 };

/** Pastille : la flèche, dans son rond, glisse vers la gauche au survol. « Accueil » sur téléphone. */
function BackHome() {
    return (
        <Link
            href={home()}
            className="group flex h-10 items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pr-4 pl-1 text-sm font-semibold text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_8px_24px_-12px_rgba(2,122,72,0.25)] transition-all duration-300 hover:border-green-200 hover:text-ink hover:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_28px_-12px_rgba(2,122,72,0.4)] focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-offset-2 focus-visible:outline-none"
        >
            <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-motriks text-white shadow-sm shadow-green-700/30 transition-colors duration-300 group-hover:bg-motriks-deep">
                {/* La flèche sort par la gauche pendant qu'une autre arrive par la droite */}
                <ArrowLeft className="size-4 transition-transform duration-300 ease-out group-hover:-translate-x-6" />
                <ArrowLeft className="absolute size-4 translate-x-6 transition-transform duration-300 ease-out group-hover:translate-x-0" />
            </span>
            <span className="sm:hidden">Accueil</span>
            <span className="hidden sm:inline">Retour à l’accueil</span>
        </Link>
    );
}

/**
 * Pages de connexion, inscription, mot de passe… : fond blanc, titre au-dessus d'une carte biseautée.
 * Le layout reste monté d'une page à l'autre, ce qui permet la transition animée entre elles.
 */
export default function AuthMotriksLayout({ children, title, description, headerLink }: AuthLayoutProps) {
    const { component } = usePage();
    const transition = useAuthTransitionController();
    // Le titre s'efface avec les champs et revient avec l'onde
    const away = transition.phase === 'leaving' || transition.phase === 'morph';

    return (
        <AuthTransitionProvider value={transition}>
            <div className="theme-light relative flex min-h-dvh flex-col overflow-x-hidden bg-white text-ink">

                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="relative z-10 flex items-center justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-5"
                >
                    <Link href={home()} aria-label="Motriks, page d’accueil" className="rounded-xl transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-offset-4 focus-visible:outline-none">
                        <MotriksLogo className="[&>span:last-child]:text-xl sm:[&>span:last-child]:text-2xl [&>svg]:size-8 sm:[&>svg]:size-9" />
                    </Link>
                    <BackHome />
                </motion.header>

                <main className="relative z-10 flex flex-1 flex-col items-center justify-center py-6 sm:py-8">
                    <div className="w-full">
                        <AuthHeading contentKey={component} title={title} description={description} away={away} />

                        <AuthCard phase={transition.phase} contentKey={component} width={CARD_WIDTH[component] ?? 420}>
                            {CASCADING.includes(component) ? children : <StaggerItem>{children}</StaggerItem>}

                            {headerLink && (
                                <StaggerItem className="mt-6 flex flex-col gap-5">
                                    <AuthDivider>{headerLink.text.replace(/\s*\?$/, '')}</AuthDivider>
                                    <TransitionLink href={headerLink.href} className={authOutlineButton}>
                                        {headerLink.label}
                                    </TransitionLink>
                                </StaggerItem>
                            )}
                        </AuthCard>
                    </div>
                </main>

                <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 pb-6 text-xs text-slate-400">
                    <span>© {new Date().getFullYear()} Motriks</span>
                    <span aria-hidden="true">·</span>
                    <Link href={conditions()} className="transition-colors hover:text-slate-600">
                        Conditions
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link href={confidentialite()} className="transition-colors hover:text-slate-600">
                        Confidentialité
                    </Link>
                </footer>
            </div>
        </AuthTransitionProvider>
    );
}
