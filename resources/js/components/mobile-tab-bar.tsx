import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, type LucideIcon } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { currentPath, mobileTabsFor, showsMobileTabs } from '@/lib/mobile-tabs';
import { cn } from '@/lib/utils';

/** Hauteur de la barre (sans la zone du bas de l'iPhone) : sert aussi à l'espace réservé sous la page. */
const BAR = 'h-16';

function TabFace({
    icon: Icon,
    title,
    active,
}: {
    icon: LucideIcon;
    title: string;
    active: boolean;
}) {
    return (
        <>
            {/* Pastille derrière l'icône de l'onglet actif (Material 3), retour visuel au toucher sinon */}
            <span
                className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 group-active:scale-90',
                    active
                        ? 'bg-motriks-soft text-motriks-deep'
                        : 'text-slate-500 group-active:bg-slate-100',
                )}
            >
                <Icon
                    className="size-[22px]"
                    strokeWidth={active ? 2.25 : 1.85}
                />
            </span>
            <span
                className={cn(
                    'text-[11px] leading-none tracking-tight',
                    active
                        ? 'font-semibold text-motriks-deep'
                        : 'font-medium text-slate-500',
                )}
            >
                {title}
            </span>
        </>
    );
}

function TabCell({ children }: { children: ReactNode }) {
    return <li className="flex min-w-0 flex-1">{children}</li>;
}

const CELL =
    'group flex w-full min-w-0 flex-col items-center justify-center gap-1 outline-none focus-visible:bg-slate-50';

/**
 * Barre d'onglets du téléphone (masquée sur ordinateur, où le menu latéral reste affiché).
 * Toucher l'onglet déjà ouvert remonte en haut de la page, comme dans les applications mobiles.
 */
export function MobileTabBar() {
    const { auth } = usePage().props;
    const url = usePage().url;
    const { openMobile, setOpenMobile } = useSidebar();
    const role = auth?.user?.role;

    if (!showsMobileTabs(role, url)) {
        return null;
    }

    const path = currentPath(url);
    const tabs = mobileTabsFor(role);
    const onTab = tabs.some((tab) => tab.matches(path));

    const scrollTop = (event: MouseEvent, active: boolean) => {
        if (!active) return;
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            {/* Place réservée sous le contenu : la fin de la page ne passe jamais sous la barre */}
            <div
                aria-hidden="true"
                className={cn(
                    BAR,
                    'box-content shrink-0 pb-[env(safe-area-inset-bottom)] md:hidden',
                )}
            />

            <nav
                aria-label="Navigation principale"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(15,23,42,0.25)] backdrop-blur-xl [view-transition-name:tab-bar] md:hidden"
            >
                <ul className={cn(BAR, 'mx-auto flex max-w-md px-1')}>
                    {tabs.map((tab) => {
                        const active = !openMobile && tab.matches(path);
                        return (
                            <TabCell key={tab.href}>
                                <Link
                                    href={tab.href}
                                    prefetch="click"
                                    viewTransition
                                    aria-current={active ? 'page' : undefined}
                                    onClick={(event) =>
                                        scrollTop(event, active)
                                    }
                                    className={CELL}
                                >
                                    <TabFace
                                        icon={tab.icon}
                                        title={tab.title}
                                        active={active}
                                    />
                                </Link>
                            </TabCell>
                        );
                    })}
                    <TabCell>
                        <button
                            type="button"
                            onClick={() => setOpenMobile(true)}
                            aria-label="Plus : menu complet"
                            aria-expanded={openMobile}
                            className={CELL}
                        >
                            {/* Allumé aussi sur les écrans du menu (statistiques, planning…) qui n'ont pas d'onglet */}
                            <TabFace
                                icon={LayoutGrid}
                                title="Plus"
                                active={openMobile || !onTab}
                            />
                        </button>
                    </TabCell>
                </ul>
            </nav>
        </>
    );
}
