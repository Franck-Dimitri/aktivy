import { useForm } from '@inertiajs/react';
import { BellRing, CalendarClock, Clock, FileWarning, LogIn, LogOut, MessageSquareWarning, Moon, PackageX, Send, UserX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { reminders as remindersRoute } from '@/routes/company/settings';

export type Reminders = {
    shift_upcoming: boolean;
    shift_upcoming_minutes: number;
    shift_late: boolean;
    shift_late_minutes: number;
    closing: boolean;
    closing_minutes: number;
    report: boolean;
    report_time: string;
    missing_reports: boolean;
    missing_reports_time: string;
    low_stock: boolean;
    low_stock_time: string;
    tickets: boolean;
    tickets_hours: number;
    event_tomorrow: boolean;
    event_tomorrow_time: string;
    default_start: string;
    default_end: string;
    quiet_start: string;
    quiet_end: string;
};

type ToggleKey = 'shift_upcoming' | 'shift_late' | 'closing' | 'report' | 'missing_reports' | 'low_stock' | 'tickets' | 'event_tomorrow';
type Setting = { key: ToggleKey; icon: LucideIcon; title: string; text: string; control: ReactNode };

const timeInput =
    'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-ink tabular-nums outline-none transition-[border-color,box-shadow] focus:border-motriks focus:ring-4 focus:ring-motriks/10 disabled:opacity-40 dark:border-sidebar-border dark:bg-transparent';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-motriks/20 focus-visible:outline-none', checked ? 'bg-motriks' : 'bg-slate-200 dark:bg-white/15')}
        >
            <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
        </button>
    );
}

/** Réglages des rappels automatiques de l'entreprise (heures du fuseau de l'entreprise). */
export function RemindersPanel({ initial, timezone }: { initial: Reminders; timezone: string }) {
    const { data, setData, put, processing, errors, isDirty, reset, setDefaults } = useForm<Reminders>(initial);

    const num = (key: 'shift_upcoming_minutes' | 'shift_late_minutes' | 'closing_minutes' | 'tickets_hours', suffix: string, max: number, disabled: boolean) => (
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="number" inputMode="numeric" min={key === 'closing_minutes' ? 0 : 1} max={max} value={data[key]} onChange={(e) => setData(key, Number(e.target.value))} disabled={disabled} className={cn(timeInput, 'w-16 text-right')} aria-label={key} />
            {suffix}
        </label>
    );
    const time = (key: 'report_time' | 'missing_reports_time' | 'low_stock_time' | 'event_tomorrow_time', prefix: string, disabled: boolean) => (
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
            {prefix}
            <input type="time" value={data[key]} onChange={(e) => setData(key, e.target.value)} disabled={disabled} className={cn(timeInput, 'w-[7rem]')} aria-label={key} />
        </label>
    );

    const groups: { title: string; hint: string; items: Setting[] }[] = [
        {
            title: 'Hôtesses',
            hint: 'Sur leur téléphone',
            items: [
                { key: 'shift_upcoming', icon: LogIn, title: 'Avant la prise de service', text: 'Rappel avant le début du créneau.', control: num('shift_upcoming_minutes', 'min avant', 180, !data.shift_upcoming) },
                { key: 'shift_late', icon: UserX, title: 'Pas encore pointée', text: 'L’hôtesse et ses responsables sont prévenus.', control: num('shift_late_minutes', 'min de retard', 240, !data.shift_late) },
                { key: 'closing', icon: LogOut, title: 'Fin de créneau', text: 'Service toujours en cours : clôturer et envoyer le rapport.', control: num('closing_minutes', 'min après', 180, !data.closing) },
                { key: 'report', icon: Send, title: 'Rapport non envoyé', text: 'Le rapport du jour est resté en brouillon.', control: time('report_time', 'à', !data.report) },
            ],
        },
        {
            title: 'Responsables',
            hint: 'Gérant et superviseurs concernés',
            items: [
                { key: 'missing_reports', icon: FileWarning, title: 'Rapports manquants', text: 'Récapitulatif des hôtesses sans rapport envoyé.', control: time('missing_reports_time', 'à', !data.missing_reports) },
                { key: 'low_stock', icon: PackageX, title: 'Stocks bas', text: 'Récapitulatif des produits sous leur seuil.', control: time('low_stock_time', 'à', !data.low_stock) },
                { key: 'tickets', icon: MessageSquareWarning, title: 'Demandes sans réponse', text: 'Une demande d’hôtesse attend depuis trop longtemps.', control: num('tickets_hours', 'h sans réponse', 72, !data.tickets) },
                { key: 'event_tomorrow', icon: CalendarClock, title: 'Événement demain', text: 'La veille, au gérant et aux hôtesses de l’événement.', control: time('event_tomorrow_time', 'à', !data.event_tomorrow) },
            ],
        },
    ];

    const fieldErrors = Object.values(errors);

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-7 dark:border-sidebar-border">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                    <BellRing className="size-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold tracking-tight text-ink">Rappels automatiques</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Envoyés sous la cloche et en notification, une seule fois par cas. Heures de {timezone.replace('Africa/', '')}.</p>
                </div>
            </header>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    put(remindersRoute().url, { preserveScroll: true, onSuccess: () => setDefaults(), onError: toastFormError });
                }}
            >
                <div className="grid lg:grid-cols-2">
                    {groups.map((g, gi) => (
                        <div key={g.title} className={cn('px-5 py-5 sm:px-7', gi > 0 && 'border-t border-slate-100 lg:border-t-0 lg:border-l dark:border-sidebar-border')}>
                            <p className="mb-3 flex items-baseline gap-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                {g.title}
                                <span className="font-normal tracking-normal normal-case">· {g.hint}</span>
                            </p>
                            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-sidebar-border">
                                {g.items.map(({ key, icon: Icon, title, text, control }) => (
                                    <li key={key} className="flex flex-col gap-2.5 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <Icon className={cn('mt-0.5 size-4 shrink-0', data[key] ? 'text-motriks' : 'text-slate-300')} />
                                            <div className="min-w-0">
                                                <p className={cn('text-sm font-medium', data[key] ? 'text-ink' : 'text-slate-400')}>{title}</p>
                                                <p className="text-xs text-slate-500">{text}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pl-7 sm:justify-end sm:pl-0">
                                            {control}
                                            <Switch checked={data[key]} onChange={(v) => setData(key, v)} label={title} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-2 sm:px-7 dark:border-sidebar-border dark:bg-white/[0.02]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Moon className="size-4 shrink-0 text-slate-400" />
                        <span className="text-sm font-medium text-ink">Aucun rappel la nuit</span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            de <input type="time" value={data.quiet_start} onChange={(e) => setData('quiet_start', e.target.value)} className={cn(timeInput, 'w-[7rem]')} aria-label="Début de la nuit" />
                            à <input type="time" value={data.quiet_end} onChange={(e) => setData('quiet_end', e.target.value)} className={cn(timeInput, 'w-[7rem]')} aria-label="Fin de la nuit" />
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Clock className="size-4 shrink-0 text-slate-400" />
                        <span className="text-sm font-medium text-ink">Créneau par défaut</span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <input type="time" value={data.default_start} onChange={(e) => setData('default_start', e.target.value)} className={cn(timeInput, 'w-[7rem]')} aria-label="Début du créneau par défaut" />
                            – <input type="time" value={data.default_end} onChange={(e) => setData('default_end', e.target.value)} className={cn(timeInput, 'w-[7rem]')} aria-label="Fin du créneau par défaut" />
                        </span>
                        <span className="basis-full pl-7 text-[11px] text-slate-400">Pour les affectations sans horaires.</span>
                    </div>
                </div>

                <footer className={cn('flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7', isDirty ? 'border-amber-200/70 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]' : 'border-slate-100 dark:border-sidebar-border')}>
                    <p className="text-xs text-slate-500">{fieldErrors.length ? <span className="text-red-600">{fieldErrors[0]}</span> : isDirty ? 'Modifications non enregistrées' : 'Les rappels suivent ces réglages.'}</p>
                    <div className="flex gap-2">
                        {isDirty && (
                            <ActionButton variant="ghost" onClick={() => reset()} disabled={processing}>
                                Annuler
                            </ActionButton>
                        )}
                        <ActionButton type="submit" loading={processing} disabled={!isDirty}>
                            Enregistrer les rappels
                        </ActionButton>
                    </div>
                </footer>
            </form>
        </section>
    );
}
