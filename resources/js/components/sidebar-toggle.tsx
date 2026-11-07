import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const EASE = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]';

/**
 * Bouton du menu latéral.
 * - Ordinateur : un cadre arrondi dont la colonne verte (le menu) s'élargit ou se réduit avec le menu ;
 *   au survol, elle prévisualise l'état suivant.
 * - Téléphone : deux traits (le second plus court) qui s'égalisent au toucher.
 */
export function SidebarToggle({ className }: { className?: string }) {
    const { state, toggleSidebar, isMobile, openMobile } = useSidebar();
    const expanded = isMobile ? openMobile : state === 'expanded';
    const label = isMobile ? 'Ouvrir le menu' : expanded ? 'Réduire le menu' : 'Afficher le menu';

    const button = (
        <button
            type="button"
            data-sidebar="trigger"
            onClick={toggleSidebar}
            aria-label={label}
            aria-expanded={expanded}
            className={cn(
                'group relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-200 md:size-9',
                'hover:bg-muted hover:text-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                className,
            )}
        >
            {isMobile ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M4 8.5h16" />
                    <path d="M4 15.5h9" className={cn('origin-left transition-transform duration-300 group-hover:scale-x-[1.78] group-active:scale-x-[1.78]', EASE)} style={{ transformBox: 'fill-box' }} />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round">
                    <rect x="3" y="4.5" width="18" height="15" rx="4.5" />
                    {/* Le menu : large quand il est déplié, fin quand il est réduit */}
                    <rect
                        x="5.75"
                        y="7.25"
                        width="6.5"
                        height="9.5"
                        rx="2"
                        stroke="none"
                        className={cn(
                            'origin-left fill-primary transition-transform duration-300',
                            EASE,
                            expanded ? 'scale-x-100 group-hover:scale-x-[0.32]' : 'scale-x-[0.32] group-hover:scale-x-100',
                        )}
                        style={{ transformBox: 'fill-box' }}
                    />
                </svg>
            )}
        </button>
    );

    if (isMobile) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
                {label}
                <kbd className="rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground">Ctrl B</kbd>
            </TooltipContent>
        </Tooltip>
    );
}
