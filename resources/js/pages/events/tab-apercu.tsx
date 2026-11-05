import { useForm } from '@inertiajs/react';
import { ArrowRight, Building2, CheckCircle2, Circle, Lock, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { TextArea, TextInput } from '@/components/page/form-fields';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { update as eventUpdate } from '@/routes/events';
import { dateRange, totalDays } from './event-dates';
import type { EventData, EventSales, TabId } from './types';

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function Row({ label, hint, htmlFor, error, children }: { label: string; hint?: string; htmlFor?: string; error?: string; children: ReactNode }) {
    return (
        <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
            <div className="sm:pt-3">
                <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
                    {label}
                </label>
                {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
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

function Info({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="text-sm font-medium break-words text-ink">{children}</dd>
        </div>
    );
}

/** Ce qu'il reste à préparer avant de lancer un brouillon. */
function Readiness({ event, onGoTo }: { event: EventData; onGoTo: (t: TabId) => void }) {
    const unassigned = event.hostesses.filter((h) => !h.event_site_id).length;
    const steps: { done: boolean; label: string; hint: string; tab: TabId; optional?: boolean }[] = [
        { done: event.sites.length > 0, label: 'Points de vente', hint: event.sites.length ? `${event.sites.length} ajouté${event.sites.length > 1 ? 's' : ''}` : 'Où l’événement a lieu', tab: 'pdv' },
        { done: event.hostesses.length > 0, label: 'Hôtesses', hint: event.hostesses.length ? `${event.hostesses.length} recrutée${event.hostesses.length > 1 ? 's' : ''}` : 'Qui anime les stands', tab: 'hotesses' },
        {
            done: event.hostesses.length > 0 && unassigned === 0,
            label: 'Affectations',
            hint: !event.hostesses.length ? 'Chaque hôtesse sur un point de vente' : unassigned ? `${unassigned} sans point de vente` : 'Toutes placées',
            tab: 'hotesses',
        },
        { done: event.packs.length > 0, label: 'Packs produits', hint: event.packs.length ? `${event.packs.length} pack${event.packs.length > 1 ? 's' : ''}` : 'Offres promotionnelles', tab: 'packs', optional: true },
    ];
    const required = steps.filter((s) => !s.optional);
    const ready = required.filter((s) => s.done).length;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-semibold text-ink">Prêt à lancer ?</h2>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        {ready}/{required.length}
                    </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-motriks transition-[width] duration-500" style={{ width: `${(ready / required.length) * 100}%` }} />
                </div>
            </div>
            <ul className="border-t border-slate-100 dark:border-sidebar-border">
                {steps.map((s) => (
                    <li key={s.label}>
                        <button type="button" onClick={() => onGoTo(s.tab)} className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            {s.done ? <CheckCircle2 className="size-[18px] shrink-0 text-motriks" /> : <Circle className="size-[18px] shrink-0 text-slate-300" />}
                            <span className="min-w-0 flex-1">
                                <span className={cn('block text-sm font-medium', s.done ? 'text-slate-500' : 'text-ink')}>
                                    {s.label}
                                    {s.optional && <span className="ml-1.5 text-xs font-normal text-slate-400">facultatif</span>}
                                </span>
                                <span className="block truncate text-xs text-slate-400">{s.hint}</span>
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function SalesSummary({ sales, onGoTo }: { sales: EventSales; onGoTo: (t: TabId) => void }) {
    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <TrendingUp className="size-4 text-motriks" />
                Chiffre d’affaires
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums">{nf.format(sales.revenue)} FCFA</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-sidebar-border">
                <div>
                    <dt className="text-xs text-slate-500">Unités vendues</dt>
                    <dd className="text-sm font-semibold text-ink tabular-nums">{nf.format(sales.units_sold)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-slate-500">Rapports</dt>
                    <dd className="text-sm font-semibold text-ink tabular-nums">{sales.reports_count}</dd>
                </div>
            </dl>
            <button type="button" onClick={() => onGoTo('ventes')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-motriks-deep hover:underline">
                Détail des ventes
                <ArrowRight className="size-3.5" />
            </button>
        </section>
    );
}

export function TabApercu({ event, sales, onGoTo }: { event: EventData; sales: EventSales; onGoTo: (t: TabId) => void }) {
    const canEdit = event.status === 'draft';

    const { data, setData, put, processing, errors, isDirty, reset, setDefaults } = useForm({
        name: event.name,
        description: event.description ?? '',
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location ?? '',
        city: event.city ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(eventUpdate({ event: event.id }).url, { preserveScroll: true, onSuccess: () => setDefaults(), onError: toastFormError });
    };

    const days = data.start_date && data.end_date && data.end_date >= data.start_date ? totalDays(data.start_date, data.end_date) : null;

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-sidebar-border">
                    <div>
                        <h2 className="text-[15px] font-semibold text-ink">Informations</h2>
                        <p className="mt-0.5 text-xs text-slate-500">{canEdit ? 'Modifiables tant que l’événement n’est pas lancé.' : 'Figées depuis le lancement.'}</p>
                    </div>
                    {!canEdit && <Lock className="size-4 shrink-0 text-slate-300" />}
                </header>

                {canEdit ? (
                    <form onSubmit={submit}>
                        <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
                            <Row label="Nom" htmlFor="ev-name" error={errors.name}>
                                <TextInput id="ev-name" icon={Sparkles} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} maxLength={255} required />
                            </Row>
                            <Row label="Description" hint="Facultatif" htmlFor="ev-description" error={errors.description}>
                                <TextArea id="ev-description" rows={3} value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Objectifs, produits mis en avant, consignes…" error={errors.description} maxLength={2000} />
                            </Row>
                            <Row label="Période" hint={days ? `${days} jour${days > 1 ? 's' : ''}` : undefined} error={errors.start_date ?? errors.end_date}>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <TextInput type="date" aria-label="Date de début" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} error={errors.start_date} required />
                                    <TextInput type="date" aria-label="Date de fin" min={data.start_date || undefined} value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} error={errors.end_date} required />
                                </div>
                            </Row>
                            <Row label="Lieu" hint="Facultatif" error={errors.location ?? errors.city}>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <TextInput icon={Building2} aria-label="Lieu ou salle" value={data.location} onChange={(e) => setData('location', e.target.value)} placeholder="Palais des Congrès" error={errors.location} maxLength={255} />
                                    <TextInput icon={MapPin} aria-label="Ville" value={data.city} onChange={(e) => setData('city', e.target.value)} placeholder="Douala" error={errors.city} maxLength={100} />
                                </div>
                            </Row>
                        </div>

                        <footer
                            className={cn(
                                'flex items-center justify-between gap-3 border-t px-5 py-3.5 transition-colors sm:px-6',
                                isDirty ? 'border-amber-200/70 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]' : 'border-slate-100 dark:border-sidebar-border',
                            )}
                        >
                            <p className="text-xs text-slate-500">{isDirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}</p>
                            <div className="flex gap-2">
                                {isDirty && (
                                    <ActionButton variant="ghost" size="sm" onClick={() => reset()} disabled={processing}>
                                        Annuler
                                    </ActionButton>
                                )}
                                <ActionButton type="submit" size="sm" loading={processing} disabled={!isDirty}>
                                    Enregistrer
                                </ActionButton>
                            </div>
                        </footer>
                    </form>
                ) : (
                    <dl className="divide-y divide-slate-100 px-5 sm:px-6 dark:divide-sidebar-border">
                        <Info label="Nom">{event.name}</Info>
                        <Info label="Période">
                            {dateRange(event.start_date, event.end_date)}
                            <span className="font-normal text-slate-400"> · {totalDays(event.start_date, event.end_date)} jours</span>
                        </Info>
                        <Info label="Lieu">{[event.location, event.city].filter(Boolean).join(', ') || <span className="font-normal text-slate-400">Non renseigné</span>}</Info>
                        {event.activated_at && <Info label="Lancé le">{event.activated_at}</Info>}
                        <Info label="Description">{event.description || <span className="font-normal text-slate-400">Aucune</span>}</Info>
                    </dl>
                )}
            </section>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
                {event.status === 'draft' ? <Readiness event={event} onGoTo={onGoTo} /> : <SalesSummary sales={sales} onGoTo={onGoTo} />}
            </aside>
        </div>
    );
}
