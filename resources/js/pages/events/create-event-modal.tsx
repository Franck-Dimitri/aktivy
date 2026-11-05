import { useForm } from '@inertiajs/react';
import { ArrowRight, Building2, CalendarPlus, MapPin, Package, Sparkles, Store, Users } from 'lucide-react';
import { useCallback, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Field, TextArea, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { store as eventStore } from '@/routes/events';

const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda', 'Kribi', 'Limbé'];

/** Date du jour au format AAAA-MM-JJ, à l'heure locale. */
function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function durationDays(start: string, end: string): number | null {
    if (!start || !end) return null;
    const ms = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
    return Number.isNaN(ms) || ms < 0 ? null : Math.round(ms / 86_400_000) + 1;
}

function longDate(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function Group({ step, title, children }: { step: number; title: string; children: ReactNode }) {
    return (
        <section className="grid gap-4">
            <h3 className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                <span className="flex size-5 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white tabular-nums dark:bg-white dark:text-slate-900">{step}</span>
                {title}
            </h3>
            {children}
        </section>
    );
}

/** Modal de création d'un événement. À monter uniquement quand il est ouvert. */
export function CreateEventModal({ onClose }: { onClose: () => void }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        start_date: today(),
        end_date: '',
        location: '',
        city: 'Douala',
    });

    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const days = durationDays(data.start_date, data.end_date);
    const endBeforeStart = !!data.start_date && !!data.end_date && days === null;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(eventStore().url, {
            onSuccess: () => toast.success('Événement créé', { description: `« ${data.name} » est prêt à être configuré.` }),
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={close} title="Nouvel événement" description="Salon, foire ou opération promotionnelle : commencez par l'essentiel." size="lg" icon={<CalendarPlus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-7 overflow-y-auto px-6 pt-4 pb-6">
                    <Group step={1} title="L'événement">
                        <Field label="Nom" htmlFor="ev-name" required error={errors.name}>
                            <TextInput
                                id="ev-name"
                                icon={Sparkles}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Ex. : Foire Made in Cameroun 2026"
                                error={errors.name}
                                maxLength={255}
                                required
                                autoFocus
                            />
                        </Field>
                        <Field label="Description" htmlFor="ev-description" hint="(optionnel)" error={errors.description}>
                            <TextArea
                                id="ev-description"
                                rows={2}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Objectifs, produits mis en avant, consignes pour les hôtesses…"
                                error={errors.description}
                                maxLength={2000}
                            />
                        </Field>
                    </Group>

                    <Group step={2} title="Période">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Début" htmlFor="ev-start" required error={errors.start_date}>
                                <TextInput id="ev-start" type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} error={errors.start_date} required />
                            </Field>
                            <Field label="Fin" htmlFor="ev-end" required error={errors.end_date ?? (endBeforeStart ? 'La fin doit suivre le début.' : undefined)}>
                                <TextInput
                                    id="ev-end"
                                    type="date"
                                    min={data.start_date || undefined}
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                    error={errors.end_date ?? (endBeforeStart ? 'invalide' : undefined)}
                                    required
                                />
                            </Field>
                        </div>

                        <div
                            className={cn(
                                'flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 transition-colors',
                                days ? 'bg-motriks-soft/70 text-motriks-deep ring-motriks/15' : 'bg-slate-50 text-slate-400 ring-slate-100 dark:bg-white/[0.03] dark:ring-sidebar-border',
                            )}
                        >
                            {days ? (
                                <>
                                    <span className="flex min-w-0 items-center gap-2 font-medium">
                                        <span className="truncate capitalize">{longDate(data.start_date)}</span>
                                        <ArrowRight className="size-3.5 shrink-0 opacity-60" />
                                        <span className="truncate capitalize">{longDate(data.end_date)}</span>
                                    </span>
                                    <span className="shrink-0 rounded-lg bg-white px-2 py-0.5 text-xs font-bold tabular-nums shadow-xs dark:bg-card">
                                        {days} jour{days > 1 ? 's' : ''}
                                    </span>
                                </>
                            ) : (
                                <span>Choisissez les deux dates pour voir la durée.</span>
                            )}
                        </div>
                    </Group>

                    <Group step={3} title="Lieu">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Lieu ou salle" htmlFor="ev-location" hint="(optionnel)" error={errors.location}>
                                <TextInput id="ev-location" icon={Building2} value={data.location} onChange={(e) => setData('location', e.target.value)} placeholder="Ex. : Palais des Congrès" error={errors.location} maxLength={255} />
                            </Field>
                            <Field label="Ville" htmlFor="ev-city" error={errors.city}>
                                <TextInput id="ev-city" icon={MapPin} list="ev-cities" value={data.city} onChange={(e) => setData('city', e.target.value)} placeholder="Douala" error={errors.city} maxLength={100} />
                                <datalist id="ev-cities">
                                    {CITIES.map((c) => (
                                        <option key={c} value={c} />
                                    ))}
                                </datalist>
                            </Field>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {CITIES.slice(0, 4).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setData('city', c)}
                                    className={cn(
                                        'rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
                                        data.city === c ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900' : 'text-slate-500 ring-slate-200 hover:text-ink hover:ring-slate-300 dark:ring-sidebar-border',
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </Group>

                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 dark:border-sidebar-border">
                        <p className="text-xs font-semibold text-slate-500">Ensuite, depuis la fiche de l'événement</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {[
                                { icon: Store, label: 'Points de vente' },
                                { icon: Package, label: 'Packs produits' },
                                { icon: Users, label: 'Hôtesses' },
                            ].map(({ icon: Icon, label }) => (
                                <span key={label} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-white/[0.03]">
                                    <Icon className="size-3.5 text-slate-400" />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-sidebar-border dark:bg-card">
                    <p className="hidden text-xs text-slate-400 sm:block">Créé en brouillon, lancé quand vous êtes prêt.</p>
                    <div className="flex flex-1 justify-end gap-3 sm:flex-none">
                        <ActionButton variant="secondary" onClick={close} disabled={processing}>
                            Annuler
                        </ActionButton>
                        <ActionButton type="submit" loading={processing} disabled={endBeforeStart} icon={<CalendarPlus />}>
                            Créer l'événement
                        </ActionButton>
                    </div>
                </footer>
            </form>
        </Modal>
    );
}
