import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
};

/** Cadre de chaque page du back-office : titre, description, actions principales, puis contenu. */
export function Page({ title, description, actions, children, className }: Props) {
    return (
        <div
            className={cn(
                'mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
                className,
            )}
        >
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.65rem]">{title}</h1>
                    {description && (
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
                    )}
                </div>
                {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
            </header>

            {children}
        </div>
    );
}

export function Panel({
    title,
    description,
    actions,
    children,
    className,
}: {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card',
                className,
            )}
        >
            {title && (
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-sidebar-border">
                    <div>
                        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
                        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}
