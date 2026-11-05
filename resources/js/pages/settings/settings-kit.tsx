import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';

/** Carte d'une rubrique de « Mon compte » : pastille d'icône, titre, aide, puis contenu. */
export function SettingsCard({
    icon: Icon,
    title,
    description,
    aside,
    badge,
    tone = 'default',
    children,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    aside?: ReactNode;
    /** Petit état affiché à côté du titre (ex. « Activée »). */
    badge?: ReactNode;
    tone?: 'default' | 'danger';
    children: ReactNode;
}) {
    const danger = tone === 'danger';

    return (
        <section
            className={cn(
                'overflow-hidden rounded-2xl border bg-white shadow-sm shadow-slate-900/[0.03] dark:bg-card',
                danger ? 'border-red-200/70 dark:border-red-500/20' : 'border-slate-200/80 dark:border-sidebar-border',
            )}
        >
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-slate-100 px-5 py-5 sm:px-7 dark:border-sidebar-border">
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl',
                            danger ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-motriks-soft text-motriks-deep',
                        )}
                    >
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
                            {badge}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                    </div>
                </div>
                {aside}
            </header>
            {children}
        </section>
    );
}

/** Corps d'une carte : champs empilés avec des marges régulières. */
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('flex flex-col gap-5 px-5 py-6 sm:px-7', className)}>{children}</div>;
}

/** Libellé à gauche, champ à droite (empilés sur téléphone). */
export function SettingsRow({
    label,
    htmlFor,
    hint,
    required,
    error,
    children,
}: {
    label: string;
    htmlFor?: string;
    hint?: ReactNode;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-6">
            <div className="sm:pt-3">
                <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
                    {label}
                    {required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{hint}</p>}
            </div>
            <div className="min-w-0">
                {children}
                {error && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}

/** Pied de carte : état des modifications, Annuler, Enregistrer. */
export function SaveFooter({
    dirty,
    processing,
    idle,
    label = 'Enregistrer',
    alwaysEnabled,
    onCancel,
    testId,
}: {
    dirty: boolean;
    processing: boolean;
    idle: string;
    label?: string;
    alwaysEnabled?: boolean;
    onCancel: () => void;
    testId?: string;
}) {
    return (
        <footer
            className={cn(
                'flex flex-col gap-3 border-t px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-7',
                dirty ? 'border-amber-200/70 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]' : 'border-slate-100 bg-slate-50/50 dark:border-sidebar-border dark:bg-white/[0.02]',
            )}
        >
            <p className="flex items-center gap-2 text-xs text-slate-500">
                {dirty && <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />}
                {dirty ? 'Modifications non enregistrées' : idle}
            </p>
            <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                {dirty && (
                    <ActionButton variant="ghost" onClick={onCancel} disabled={processing}>
                        Annuler
                    </ActionButton>
                )}
                <ActionButton type="submit" loading={processing} disabled={!dirty && !alwaysEnabled} data-test={testId}>
                    {label}
                </ActionButton>
            </div>
        </footer>
    );
}

/** Champ mot de passe au style des autres champs, avec œil pour afficher la saisie. */
export function PasswordField({ error, ...props }: Omit<ComponentProps<'input'>, 'type'> & { error?: string; icon?: LucideIcon }) {
    const [shown, setShown] = useState(false);

    return (
        <TextInput
            {...props}
            type={shown ? 'text' : 'password'}
            error={error}
            trailing={
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShown((v) => !v)}
                    aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5"
                >
                    {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            }
        />
    );
}
