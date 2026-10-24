import { router, useForm } from '@inertiajs/react';
import { MapPin, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { GlowCard } from '@/components/page/surface';
import { ActionButton } from '@/components/page/buttons';
import { TextInput, SelectInput } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';
import { store as hostessStore, destroy as hostessDestroy } from '@/routes/events/hostesses';
import type { AvailableHostess, EventData } from './types';

type Props = { event: EventData; availableHostesses: AvailableHostess[] };
type Hostess = EventData['hostesses'][0];

const AVATAR_COLORS = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-cyan-100 text-cyan-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
];

function getAvatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('');
}

function HostessCard({ h, canEdit, onDelete }: { h: Hostess; canEdit: boolean; onDelete: () => void }) {
    const isArchived = h.status === 'archived';
    const avatarColor = getAvatarColor(h.name);

    return (
        <div className={cn(
            'group relative flex flex-col items-center gap-3 rounded-2xl bg-white p-5 ring-1 text-center transition-shadow hover:shadow-md',
            isArchived ? 'ring-slate-100 opacity-60' : 'ring-slate-100',
        )}>
            {canEdit && (
                <button
                    onClick={onDelete}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-200 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    aria-label="Retirer"
                >
                    <Trash2 className="size-3.5" />
                </button>
            )}

            {/* Avatar */}
            <div className="relative">
                <div className={cn(
                    'flex size-14 items-center justify-center rounded-full text-lg font-bold',
                    isArchived ? 'bg-slate-100 text-slate-400' : avatarColor,
                )}>
                    {initials(h.name)}
                </div>
                {!isArchived && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-white ring-2 ring-white">
                        <span className="size-2 rounded-full bg-green-400" />
                    </span>
                )}
            </div>

            {/* Name */}
            <div className="min-w-0 w-full">
                <p className="truncate text-sm font-bold text-slate-900">{h.name}</p>
                {h.phone && <p className="mt-0.5 text-xs text-slate-400">{h.phone}</p>}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap justify-center gap-1.5">
                {h.site_name && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 ring-1 ring-blue-100">
                        <MapPin className="size-2.5" />
                        {h.site_name}
                    </span>
                )}
                {h.recruited_for_event && (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 ring-1 ring-purple-100">
                        Recrutée
                    </span>
                )}
                {isArchived && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Archivée
                    </span>
                )}
            </div>
        </div>
    );
}

export function TabHostesses({ event, availableHostesses }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');

    const canEdit = !['completed', 'archived'].includes(event.status);

    const { data, setData, post, processing, reset, errors } = useForm({
        user_id:       '',
        event_site_id: '',
        name:          '',
        phone:         '',
        password:      '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(hostessStore({ event: event.id }).url, {
            // @ts-expect-error transform is supported by Inertia useForm
            transform: (d: typeof data) => ({ ...d, mode: addMode }),
            onSuccess: () => { reset(); setShowForm(false); },
        });
    }

    const activeCount   = event.hostesses.filter((h) => h.status === 'active').length;
    const archivedCount = event.hostesses.filter((h) => h.status === 'archived').length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                {event.hostesses.length > 0 && (
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-green-400" />
                            {activeCount} active{activeCount > 1 ? 's' : ''}
                        </span>
                        {archivedCount > 0 && (
                            <span className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-slate-300" />
                                {archivedCount} archivée{archivedCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}
                {canEdit && (
                    <div className="ml-auto">
                        <ActionButton icon={<UserPlus />} onClick={() => setShowForm(!showForm)} variant="secondary">
                            Ajouter une hôtesse
                        </ActionButton>
                    </div>
                )}
            </div>

            {showForm && (
                <GlowCard contentClassName="p-5" className="max-w-2xl">
                    {/* Mode tabs */}
                    <div className="mb-4 flex gap-2">
                        {(['existing', 'new'] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setAddMode(m)}
                                className={cn(
                                    'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                                    addMode === m
                                        ? 'border-motriks bg-motriks-soft text-motriks-deep'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300',
                                )}
                            >
                                {m === 'existing' ? 'Hôtesse existante' : 'Nouvelle hôtesse'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="flex flex-col gap-3">
                        {addMode === 'existing' ? (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-ink">Hôtesse</label>
                                {availableHostesses.length === 0 ? (
                                    <p className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-400">
                                        Aucune hôtesse disponible à recruter.
                                    </p>
                                ) : (
                                    <SelectInput
                                        value={data.user_id}
                                        onChange={(e) => setData('user_id', e.target.value)}
                                        error={errors.user_id}
                                    >
                                        <option value="">-- Choisir --</option>
                                        {availableHostesses.map((h) => (
                                            <option key={h.id} value={h.id}>
                                                {h.name}{h.phone ? ` — ${h.phone}` : ''}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">Nom complet</label>
                                        <TextInput
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            error={errors.name}
                                            placeholder="Prénom Nom"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">Téléphone</label>
                                        <TextInput
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            error={errors.phone}
                                            placeholder="6XXXXXXXX"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Mot de passe provisoire</label>
                                    <TextInput
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        error={errors.password}
                                        placeholder="Min. 6 caractères"
                                    />
                                </div>
                            </>
                        )}

                        {event.sites.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-ink">PDV assigné</label>
                                <SelectInput
                                    value={data.event_site_id}
                                    onChange={(e) => setData('event_site_id', e.target.value)}
                                >
                                    <option value="">-- Aucun --</option>
                                    {event.sites.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                            <ActionButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                Annuler
                            </ActionButton>
                            <ActionButton type="submit" icon={<UserPlus />} loading={processing}>
                                Ajouter
                            </ActionButton>
                        </div>
                    </form>
                </GlowCard>
            )}

            {event.hostesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                        <Users className="size-6 text-purple-400" />
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-700">Aucune hôtesse</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">
                        Recrutez des hôtesses existantes ou créez de nouveaux comptes pour cet événement.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {event.hostesses.map((h) => (
                        <HostessCard
                            key={h.id}
                            h={h}
                            canEdit={canEdit}
                            onDelete={() => router.delete(hostessDestroy({ event: event.id, hostess: h.id }).url)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
