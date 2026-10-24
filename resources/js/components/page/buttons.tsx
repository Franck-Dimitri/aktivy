import { Link } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon-danger';
export type ButtonSize = 'sm' | 'md' | 'icon';

const base =
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
    primary:
        'bg-motriks text-white shadow-sm shadow-green-600/25 hover:bg-motriks-deep hover:shadow-md hover:shadow-green-600/30',
    secondary:
        'border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
    'icon-danger':
        'border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
};

const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 rounded-lg px-3 text-xs [&_svg]:size-3.5',
    md: 'h-10 rounded-xl px-4 text-sm [&_svg]:size-4',
    icon: 'size-8 rounded-lg [&_svg]:size-3.5',
};

/** Classes d'un bouton, utilisables sur n'importe quel élément. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
    return cn(base, variants[variant], sizes[size], className);
}

export function Spinner({ className }: { className?: string }) {
    return <Loader2 className={cn('animate-spin', className)} aria-hidden />;
}

type ActionButtonProps = ComponentProps<'button'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
};

/** Bouton avec état de chargement : spinner à la place de l'icône + désactivé. */
export function ActionButton({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    type = 'button',
    disabled,
    className,
    children,
    ...props
}: ActionButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading}
            className={buttonClass(variant, size, className)}
            {...props}
        >
            {loading ? <Spinner /> : icon}
            {children}
        </button>
    );
}

type ActionLinkProps = ComponentProps<typeof Link> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: ReactNode;
};

/** Lien Inertia stylé en bouton : affiche un spinner pendant la navigation. */
export function ActionLink({
    variant = 'primary',
    size = 'md',
    icon,
    className,
    children,
    onStart,
    onFinish,
    ...props
}: ActionLinkProps) {
    const [loading, setLoading] = useState(false);

    return (
        <Link
            {...props}
            aria-busy={loading}
            onStart={(visit) => {
                setLoading(true);
                onStart?.(visit);
            }}
            onFinish={(visit) => {
                setLoading(false);
                onFinish?.(visit);
            }}
            className={buttonClass(variant, size, cn(loading && 'pointer-events-none opacity-70', className))}
        >
            {loading ? <Spinner /> : icon}
            {children}
        </Link>
    );
}
