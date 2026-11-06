import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { cn, toUrl } from '@/lib/utils';
import type { MenuGroup } from '@/types';

function useActiveItem(groups: MenuGroup[]) {
    const page = usePage();
    const currentPath = new URL(
        page.url,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    ).pathname;

    // Toutes les URLs disponibles dans le menu
    const allHrefs = groups
        .flatMap((g) => g.items.filter((i) => i.href).map((i) => toUrl(i.href!)));

    // Correspondance exacte, sinon parent (ex: /sites active sur /sites/1/edit)
    const matches = (href: string): boolean => {
        if (href === currentPath) return true;
        const prefix = href.endsWith('/') ? href : `${href}/`;
        return currentPath.startsWith(prefix);
    };

    // Seul l'item le plus spécifique est actif : /admin/onboarding l'emporte sur /admin
    const activeHref = allHrefs
        .filter(matches)
        .sort((a, b) => b.length - a.length)[0];

    return (href: string): boolean => href === activeHref;
}

export function NavMain({ groups }: { groups: MenuGroup[] }) {
    const isActive = useActiveItem(groups);
    const { isMobile, setOpenMobile } = useSidebar();

    // Sur mobile, le menu se referme dès qu'un onglet est choisi
    const closeOnMobile = () => {
        if (isMobile) setOpenMobile(false);
    };

    return (
        <div className="flex flex-col gap-4 px-3 py-3 group-data-[collapsible=icon]:px-2">
            {groups.map((group, gi) => (
                <SidebarGroup key={group.label} className="p-0">
                    {gi > 0 && (
                        <div className="mb-3 h-px bg-sidebar-border group-data-[collapsible=icon]:hidden" />
                    )}
                    <SidebarGroupLabel className="mb-1 h-6 px-2 text-[10.5px] font-semibold tracking-wider text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                        {group.label.toUpperCase()}
                    </SidebarGroupLabel>

                    <SidebarMenu className="gap-0.5">
                        {group.items.map((item) => {
                            const active = item.href ? isActive(toUrl(item.href)) : false;
                            const available = !!item.href;

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild={available}
                                        tooltip={{ children: item.title }}
                                        aria-disabled={!available || undefined}
                                        className={cn(
                                            // Base
                                            'relative h-10 rounded-xl px-3 text-[13.5px] font-medium transition-all duration-150',
                                            '[&>svg]:size-[17px] [&>svg]:shrink-0 [&>svg]:transition-colors',
                                            // Actif — couleur principale de la barre latérale : fond léger, texte et icône, repère à gauche
                                            active && [
                                                'bg-sidebar-primary/15 font-semibold text-sidebar-primary ring-1 ring-sidebar-primary/15 ring-inset',
                                                '[&>svg]:text-sidebar-primary',
                                                'hover:bg-sidebar-primary/20 hover:text-sidebar-primary',
                                                "before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary before:content-[''] group-data-[collapsible=icon]:before:hidden",
                                            ],
                                            // Disponible non actif
                                            available && !active && [
                                                'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                                '[&>svg]:text-sidebar-foreground/65 hover:[&>svg]:text-sidebar-accent-foreground',
                                            ],
                                            // Indisponible
                                            !available && [
                                                'cursor-default text-sidebar-foreground/30',
                                                'hover:bg-transparent hover:text-sidebar-foreground/30',
                                                '[&>svg]:text-sidebar-foreground/25',
                                                'aria-disabled:pointer-events-auto aria-disabled:opacity-100',
                                            ],
                                        )}
                                    >
                                        {available ? (
                                            <Link href={item.href!} prefetch onClick={closeOnMobile}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        ) : (
                                            <>
                                                <item.icon />
                                                <span className="flex-1 truncate">{item.title}</span>
                                                <span className="shrink-0 rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                                                    bientôt
                                                </span>
                                            </>
                                        )}
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </div>
    );
}
