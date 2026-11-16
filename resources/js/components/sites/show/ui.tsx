import { type LucideIcon } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/initials';
import { type TabKey } from '@/components/sites/show/types';

/* -------------------------------------------------------------------------- */
/*  Briques d'interface                                                       */
/* -------------------------------------------------------------------------- */

export function Section({
    title,
    description,
    actions,
    children,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-4 pb-3">
                <div className="min-w-0 grow basis-40">
                    <h2 className="text-sm font-semibold text-ink">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-xs text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
                {actions}
            </header>
            <div className="border-t border-slate-100">{children}</div>
        </section>
    );
}

export function Avatar({
    name,
    size = 'md',
}: {
    name: string;
    size?: 'sm' | 'md';
}) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 font-semibold text-motriks-deep ring-1 ring-green-600/10 ring-inset',
                size === 'sm' ? 'size-9 text-xs' : 'size-10 text-sm',
            )}
        >
            {initials(name)}
        </div>
    );
}

export function Fact({
    icon: Icon,
    label,
    children,
}: {
    icon: LucideIcon;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    {label}
                </p>
                <div className="mt-0.5 text-sm font-medium text-ink">
                    {children}
                </div>
            </div>
        </div>
    );
}

export const muted = (
    <span className="font-normal text-slate-500">Non renseigné</span>
);

export function Tabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { key: TabKey; label: string; badge?: React.ReactNode }[];
    active: TabKey;
    onChange: (key: TabKey) => void;
}) {
    return (
        <div
            role="tablist"
            className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200/80 px-1"
        >
            {tabs.map((t) => {
                const selected = t.key === active;
                return (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(t.key)}
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none',
                            selected
                                ? 'border-motriks text-ink'
                                : 'border-transparent text-slate-500 hover:text-ink',
                        )}
                    >
                        {t.label}
                        {t.badge !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                                    selected
                                        ? 'bg-motriks-soft text-motriks-deep'
                                        : 'bg-slate-100 text-slate-500',
                                )}
                            >
                                {t.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function ModalFooter({
    onCancel,
    saving,
    submitLabel,
    savingLabel,
    disabled,
}: {
    onCancel: () => void;
    saving: boolean;
    submitLabel: string;
    savingLabel: string;
    disabled?: boolean;
}) {
    return (
        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <ActionButton
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={saving}
            >
                Annuler
            </ActionButton>
            <ActionButton type="submit" loading={saving} disabled={disabled}>
                {saving ? savingLabel : submitLabel}
            </ActionButton>
        </footer>
    );
}
