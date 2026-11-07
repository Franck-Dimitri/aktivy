import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonClass } from '@/components/page/buttons';
import { cn } from '@/lib/utils';

/** Page de résultats renvoyée par Laravel (paginate()). */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

/** Pied de liste : « 1 à 50 sur 133 », précédent et suivant. */
export function Pagination({
    page,
    className,
}: {
    page: Paginated<unknown>;
    className?: string;
}) {
    if (page.total === 0) return null;

    const nav = (
        url: string | null,
        label: string,
        icon: React.ReactNode,
        iconAfter = false,
    ) =>
        url ? (
            <Link
                href={url}
                preserveScroll
                className={buttonClass('secondary', 'sm')}
            >
                {!iconAfter && icon}
                {label}
                {iconAfter && icon}
            </Link>
        ) : (
            <span
                className={cn(
                    buttonClass('secondary', 'sm'),
                    'pointer-events-none opacity-40',
                )}
                aria-disabled
            >
                {!iconAfter && icon}
                {label}
                {iconAfter && icon}
            </span>
        );

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-3 px-5 py-3',
                className,
            )}
        >
            <p className="text-xs text-slate-500 tabular-nums">
                {page.from} à {page.to} sur {page.total}
            </p>
            {page.last_page > 1 && (
                <div className="flex items-center gap-2">
                    {nav(page.prev_page_url, 'Précédent', <ChevronLeft />)}
                    <span className="text-xs text-slate-500 tabular-nums">
                        Page {page.current_page} sur {page.last_page}
                    </span>
                    {nav(page.next_page_url, 'Suivant', <ChevronRight />, true)}
                </div>
            )}
        </div>
    );
}
