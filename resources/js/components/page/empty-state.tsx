import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-aktivy-soft text-aktivy-deep ring-8 ring-aktivy-soft/50">
                <Icon className="size-6" />
            </span>
            <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
