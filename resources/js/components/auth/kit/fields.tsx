import { Check, CircleAlert, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const inputClasses = cn(
    'peer h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-ink outline-none sm:text-[15px]',
    'transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400',
    'hover:border-slate-300 focus:border-motriks focus:ring-4 focus:ring-motriks/10',
    'aria-invalid:border-red-300 aria-invalid:hover:border-red-300 aria-invalid:focus:border-red-400 aria-invalid:focus:ring-red-500/10',
    'disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-default read-only:bg-slate-50 read-only:text-slate-500 read-only:focus:ring-0',
    // Remplissage automatique du navigateur : fond blanc, pas de jaune
    'autofill:shadow-[inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:#0f172a]',
);

type AuthInputProps = Omit<ComponentProps<'input'>, 'id' | 'name'> & {
    id: string;
    name: string;
    label: string;
    /** Facultative : les formulaires de connexion n'en affichent pas. */
    icon?: LucideIcon;
    error?: string;
    hint?: ReactNode;
    labelAside?: ReactNode;
    trailing?: ReactNode;
};

/** Champ : libellé au-dessus (avec un lien éventuel à droite), erreur ou aide dessous. */
export function AuthInput({ id, label, icon: Icon, error, hint, labelAside, trailing, className, ...props }: AuthInputProps) {
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className={cn('grid content-start gap-1.5', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-semibold text-ink">
                    {label}
                </label>
                {labelAside}
            </div>

            <div className="relative">
                <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(inputClasses, Icon && 'pl-11', trailing && 'pr-12')} {...props} />
                {Icon && <Icon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-motriks-deep peer-aria-invalid:text-red-500" />}
                {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
            </div>

            {error ? (
                <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-[13px] leading-snug text-red-600">
                    <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                    {error}
                </p>
            ) : (
                hint && (
                    <div id={`${id}-hint`} className="text-xs leading-snug text-slate-500">
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
    { label: 'Bon', color: 'bg-motriks' },
    { label: 'Excellent', color: 'bg-motriks-deep' },
];

function passwordScore(value: string): number {
    if (value.length < 8) return 0;
    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) => rule.test(value)).length;
    return Math.min(4, variety + (value.length >= 12 ? 1 : 0));
}

export function PasswordStrength({ value, idle = '8 caractères min.' }: { value: string; idle?: string }) {
    if (!value) return <p className="text-xs leading-snug text-slate-500">{idle}</p>;
    const score = passwordScore(value);
    const level = strengthLevels.at(score) ?? strengthLevels[0];

    return (
        <div className="flex items-center gap-3" aria-live="polite">
            <div className="grid flex-1 grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((step) => (
                    <span key={step} className={cn('h-1 rounded-full transition-colors duration-300', step <= Math.max(score, 1) ? level.color : 'bg-slate-200')} />
                ))}
            </div>
            <span className="text-xs font-medium whitespace-nowrap text-slate-500">{level.label}</span>
        </div>
    );
}

type AuthPasswordProps = Omit<AuthInputProps, 'icon' | 'trailing' | 'type'> & { showStrength?: boolean };

/** Champ mot de passe avec l'œil pour afficher / masquer. */
export function AuthPasswordInput({ showStrength = false, onChange, hint, ...props }: AuthPasswordProps) {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState('');

    return (
        <AuthInput
            {...props}
            type={visible ? 'text' : 'password'}
            onChange={(event) => {
                setValue(event.target.value);
                onChange?.(event);
            }}
            hint={showStrength ? <PasswordStrength value={typeof props.value === 'string' ? props.value : value} /> : hint}
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={visible}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                >
                    {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
            }
        />
    );
}

/** Case à cocher verte ; le libellé peut contenir des liens. */
export function AuthCheckbox({ id, name, checked, onChange, error, children }: { id: string; name?: string; checked: boolean; onChange: (checked: boolean) => void; error?: string; children: ReactNode }) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="group flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-slate-600 select-none">
                <input id={id} name={name} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? true : undefined} className="peer sr-only" />
                <span
                    aria-hidden="true"
                    className={cn(
                        'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 peer-focus-visible:ring-4 peer-focus-visible:ring-motriks/20',
                        checked ? 'border-motriks bg-motriks text-white' : 'border-slate-300 bg-white group-hover:border-slate-400',
                        error && !checked && 'border-red-300',
                    )}
                >
                    <Check className={cn('size-3 transition-transform duration-150', checked ? 'scale-100' : 'scale-0')} strokeWidth={3.5} />
                </span>
                <span>{children}</span>
            </label>
            {error && (
                <p role="alert" className="pl-7 text-[13px] leading-snug text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

const base = 'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-[18px]';

/** Classes du bouton secondaire, réutilisables sur un lien. */
export const authOutlineButton = cn(base, 'border border-slate-200 bg-white text-ink hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-motriks/15');

/** Bouton principal : vert plein. */
export function AuthButton({ className, children, loading = false, disabled, ...props }: ComponentProps<'button'> & { loading?: boolean }) {
    return (
        <button
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(base, 'bg-motriks text-white shadow-sm shadow-green-700/20 hover:bg-motriks-deep hover:shadow-md hover:shadow-green-700/25 focus-visible:ring-4 focus-visible:ring-motriks/30', className)}
            {...props}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
}

/** Bouton secondaire (clé d'accès, renvoi d'e-mail…). */
export function AuthOutlineButton({ className, children, ...props }: ComponentProps<'button'>) {
    return (
        <button className={cn(authOutlineButton, className)} {...props}>
            {children}
        </button>
    );
}

/** Séparateur : filet fin avec un court texte en capitales au milieu. */
export function AuthDivider({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-center">{children}</span>
            <span className="h-px flex-1 bg-slate-200" />
        </div>
    );
}

/** Lien vert. */
export const authLink = 'font-semibold text-motriks-deep underline-offset-4 transition-colors hover:text-motriks hover:underline focus-visible:underline focus-visible:outline-none';
