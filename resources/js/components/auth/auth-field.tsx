import { CircleAlert, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputClasses =
    'peer h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 pl-11 text-[15px] text-ink transition-[border-color,background-color,box-shadow] duration-150 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-4 focus:ring-aktivy/15 disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-default read-only:border-dashed read-only:bg-white read-only:text-slate-500 read-only:focus:ring-0 aria-invalid:border-red-400 aria-invalid:bg-red-50/40 aria-invalid:focus:ring-red-500/15 autofill:shadow-[inset_0_0_0_1000px_#f8fafc] autofill:[-webkit-text-fill-color:#0f172a] autofill:focus:shadow-[inset_0_0_0_1000px_#ffffff]';

type FieldProps = Omit<ComponentProps<'input'>, 'id' | 'name'> & {
    id: string;
    name: string;
    label: string;
    icon: LucideIcon;
    error?: string;
    hint?: ReactNode;
    labelAside?: ReactNode;
    trailing?: ReactNode;
};

export function AuthField({
    id,
    label,
    icon: Icon,
    error,
    hint,
    labelAside,
    trailing,
    className,
    ...props
}: FieldProps) {
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className={cn('grid gap-2', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-semibold text-ink">
                    {label}
                </label>
                {labelAside}
            </div>

            <div className="relative">
                <input
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={cn(inputClasses, trailing && 'pr-12')}
                    {...props}
                />
                <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-aktivy-deep peer-aria-invalid:text-red-500"
                />
                {trailing && (
                    <div className="absolute inset-y-0 right-1.5 flex items-center">
                        {trailing}
                    </div>
                )}
            </div>

            {error ? (
                <p
                    id={`${id}-error`}
                    className="flex items-start gap-1.5 text-[13px] leading-snug text-red-600"
                >
                    <CircleAlert
                        aria-hidden="true"
                        className="mt-px size-3.5 shrink-0"
                    />
                    {error}
                </p>
            ) : (
                hint && (
                    <div
                        id={`${id}-hint`}
                        className="text-xs leading-snug text-slate-500"
                    >
                        {hint}
                    </div>
                )
            )}
        </div>
    );
}

const strengthLevels = [
    { label: 'Trop court', color: 'bg-red-500' },
    { label: 'Faible', color: 'bg-red-500' },
    { label: 'Moyen', color: 'bg-amber-500' },
    { label: 'Bon', color: 'bg-aktivy' },
    { label: 'Excellent', color: 'bg-aktivy-deep' },
];

function passwordScore(value: string): number {
    if (value.length < 8) {
        return 0;
    }

    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) =>
        rule.test(value),
    ).length;

    return Math.min(4, variety + (value.length >= 12 ? 1 : 0));
}

function PasswordStrength({ value }: { value: string }) {
    const score = passwordScore(value);
    const level = strengthLevels.at(score) ?? strengthLevels[0];

    return (
        <div className="flex items-center gap-3" aria-live="polite">
            <div className="grid flex-1 grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((step) => (
                    <span
                        key={step}
                        className={cn(
                            'h-1 rounded-full transition-colors',
                            value && step <= Math.max(score, 1)
                                ? level.color
                                : 'bg-slate-200',
                        )}
                    />
                ))}
            </div>
            <span className="w-16 text-right text-xs font-medium text-slate-500">
                {value ? level.label : '8 caractères min.'}
            </span>
        </div>
    );
}

type PasswordFieldProps = Omit<FieldProps, 'icon' | 'trailing' | 'type'> & {
    showStrength?: boolean;
};

export function AuthPasswordField({
    showStrength = false,
    onChange,
    hint,
    ...props
}: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState('');

    return (
        <AuthField
            {...props}
            type={visible ? 'text' : 'password'}
            icon={LockKeyhole}
            onChange={(event) => {
                setValue(event.target.value);
                onChange?.(event);
            }}
            hint={showStrength ? <PasswordStrength value={value} /> : hint}
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={
                        visible
                            ? 'Masquer le mot de passe'
                            : 'Afficher le mot de passe'
                    }
                    aria-pressed={visible}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                >
                    {visible ? (
                        <EyeOff className="size-[18px]" />
                    ) : (
                        <Eye className="size-[18px]" />
                    )}
                </button>
            }
        />
    );
}

export function AuthDivider({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {children}
            <span className="h-px flex-1 bg-slate-200" />
        </div>
    );
}

export function AuthPrimaryButton({
    className,
    children,
    ...props
}: ComponentProps<'button'>) {
    return (
        <button
            className={cn(
                'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-aktivy px-5 text-[15px] font-bold text-ink shadow-[0_1px_0_rgba(15,23,42,0.08),inset_0_-2px_0_rgba(15,23,42,0.12)] transition-[background-color,transform] duration-150 hover:bg-[#46b52b] focus-visible:ring-4 focus-visible:ring-aktivy/30 focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export function AuthSecondaryButton({
    className,
    children,
    ...props
}: ComponentProps<'button'>) {
    return (
        <button
            className={cn(
                'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-aktivy/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
