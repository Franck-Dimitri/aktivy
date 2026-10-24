import { useForm } from '@inertiajs/react';
import { Calendar, Check, Info, Lock, MapPin, Zap } from 'lucide-react';
import { GlowCard } from '@/components/page/surface';
import { ActionButton } from '@/components/page/buttons';
import { TextInput, TextArea } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';
import { update as eventUpdate } from '@/routes/events';
import type { EventData } from './types';

const STATUS_BG: Record<string, string> = {
    draft:     'from-amber-500/10 to-transparent',
    active:    'from-green-500/10 to-transparent',
    completed: 'from-blue-500/10 to-transparent',
    archived:  'from-slate-400/5 to-transparent',
};

function ReadRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
    return (
        <div className="flex items-start gap-3 py-3">
            {Icon && (
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <Icon className="size-3.5 text-slate-400" />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className={cn('mt-0.5 text-sm font-medium', value ? 'text-slate-800' : 'italic text-slate-300')}>
                    {value || 'Non renseigné'}
                </p>
            </div>
        </div>
    );
}

function FormSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-motriks-soft">
                    <Icon className="size-3.5 text-motriks" />
                </div>
                <span className="text-sm font-bold text-slate-700">{title}</span>
                <div className="flex-1 border-t border-slate-100" />
            </div>
            {children}
        </div>
    );
}

export function TabApercu({ event }: { event: EventData }) {
    const canEdit = event.status === 'draft';

    const { data, setData, put, processing, errors } = useForm({
        name:        event.name,
        description: event.description ?? '',
        start_date:  event.start_date,
        end_date:    event.end_date,
        location:    event.location ?? '',
        city:        event.city,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(eventUpdate({ event: event.id }).url);
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ── Bannière statut ── */}
            <div className={cn(
                'relative overflow-hidden rounded-2xl bg-white p-px ring-1 ring-slate-100',
            )}>
                <div className={cn('rounded-[15px] bg-gradient-to-r p-5', STATUS_BG[event.status] || STATUS_BG.draft)}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900">{event.name}</h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {event.start_date} → {event.end_date}
                                {event.city && <span> · {event.city}</span>}
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                            {event.activated_at ? `Lancé le ${event.activated_at}` : 'Non lancé'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Contenu : lecture seule ou formulaire ── */}
            {!canEdit ? (
                /* Vue en lecture seule (événement lancé ou terminé) */
                <GlowCard contentClassName="divide-y divide-slate-50">
                    <div className="flex items-center gap-2 px-5 py-3">
                        <Lock className="size-4 text-slate-300" />
                        <span className="text-xs font-medium text-slate-400">
                            Informations non modifiables après lancement
                        </span>
                    </div>
                    <div className="grid gap-0 px-5 sm:grid-cols-2">
                        <ReadRow label="Nom"          value={event.name}        icon={Info} />
                        <ReadRow label="Lieu"         value={event.location}    icon={MapPin} />
                        <ReadRow label="Ville"        value={event.city}        icon={MapPin} />
                        <ReadRow label="Début"        value={event.start_date}  icon={Calendar} />
                        <ReadRow label="Fin"          value={event.end_date}    icon={Calendar} />
                    </div>
                    {event.description && (
                        <div className="px-5 py-4">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Description</p>
                            <p className="mt-1.5 text-sm text-slate-600">{event.description}</p>
                        </div>
                    )}
                </GlowCard>
            ) : (
                /* Formulaire d'édition (brouillon uniquement) */
                <GlowCard contentClassName="p-6 sm:p-7" className="max-w-2xl">
                    <form onSubmit={submit} className="flex flex-col gap-6">
                        <FormSection icon={Zap} title="Identité">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-ink">Nom</label>
                                <TextInput
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-ink">Description</label>
                                <TextArea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    placeholder="Optionnel"
                                />
                            </div>
                        </FormSection>

                        <FormSection icon={Calendar} title="Période">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Date de début</label>
                                    <TextInput
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        error={errors.start_date}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Date de fin</label>
                                    <TextInput
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        error={errors.end_date}
                                    />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection icon={MapPin} title="Lieu">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Lieu / Salle</label>
                                    <TextInput
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder="ex. Palais des Sports"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Ville</label>
                                    <TextInput
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                    />
                                </div>
                            </div>
                        </FormSection>

                        <div className="flex justify-end border-t border-slate-100 pt-4">
                            <ActionButton type="submit" icon={<Check />} loading={processing}>
                                Enregistrer les modifications
                            </ActionButton>
                        </div>
                    </form>
                </GlowCard>
            )}
        </div>
    );
}
