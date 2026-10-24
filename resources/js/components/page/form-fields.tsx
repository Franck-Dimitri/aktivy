import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const control =
    'w-full rounded-xl border border-slate-200 bg-white text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-300 focus:border-motriks focus:ring-4 focus:ring-motriks/10 disabled:bg-slate-50 disabled:opacity-60';
const invalid = 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-red-500/10';

export const inputClass = `h-11 px-3.5 ${control}`;

export function Field({
    label,
    htmlFor,
    required,
    hint,
    error,
    className,
    children,
}: {
    label: string;
    htmlFor?: string;
    required?: boolean;
    hint?: string;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1.5 text-sm font-semibold text-ink">
                {label}
                {required && <span className="text-red-500">*</span>}
                {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
            </label>
            {children}
            {error && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

type IconProps = { icon?: LucideIcon; error?: string };

export function TextInput({
    icon: Icon,
    trailing,
    error,
    className,
    ...props
}: ComponentProps<'input'> & IconProps & { trailing?: ReactNode }) {
    return (
        <div className="relative">
            {Icon && (
                <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            )}
            <input
                {...props}
                aria-invalid={error ? true : undefined}
                className={cn(inputClass, Icon && 'pl-10', trailing && 'pr-11', error && invalid, className)}
            />
            {trailing && <div className="absolute top-1/2 right-3 -translate-y-1/2">{trailing}</div>}
        </div>
    );
}

export function SelectInput({
    icon: Icon,
    error,
    className,
    children,
    ...props
}: ComponentProps<'select'> & IconProps) {
    return (
        <div className="relative">
            {Icon && (
                <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            )}
            <select
                {...props}
                aria-invalid={error ? true : undefined}
                className={cn(inputClass, 'appearance-none pr-10', Icon && 'pl-10', error && invalid, className)}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400" />
        </div>
    );
}

export function TextArea({ icon: Icon, error, className, ...props }: ComponentProps<'textarea'> & IconProps) {
    return (
        <div className="relative">
            {Icon && <Icon className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-slate-400" />}
            <textarea
                {...props}
                aria-invalid={error ? true : undefined}
                className={cn(control, 'min-h-24 resize-y px-3.5 py-2.5', Icon && 'pl-10', error && invalid, className)}
            />
        </div>
    );
}

/** Interrupteur (checkbox stylée) avec libellé et aide. */
export function ToggleField({
    checked,
    onChange,
    label,
    description,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 has-checked:border-motriks/40 has-checked:bg-motriks-soft/60">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="peer sr-only"
            />
            <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-motriks peer-focus-visible:ring-4 peer-focus-visible:ring-motriks/20 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{label}</span>
                {description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>}
            </span>
        </label>
    );
}

export function FormActions({ children }: { children: ReactNode }) {
    return <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">{children}</div>;
}
