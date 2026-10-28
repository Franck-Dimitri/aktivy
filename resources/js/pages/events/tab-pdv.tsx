import { router, useForm } from '@inertiajs/react';
import { MapPin, Plus, Store, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { GlowCard } from '@/components/page/surface';
import { ActionButton } from '@/components/page/buttons';
import { TextInput, SelectInput } from '@/components/page/form-fields';
import { cn } from '@/lib/utils';
import { store as siteStore, destroy as siteDestroy } from '@/routes/events/sites';
import type { CompanySite, EventData } from './types';

type Props = { event: EventData; companySites: CompanySite[] };

function PdvCard({ site, canEdit, onDelete }: {
    site: EventData['sites'][0];
    canEdit: boolean;
    onDelete: () => void;
}) {
    const isExisting = site.site_id !== null;

    return (
        <div className={cn(
            'group relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-white p-5 ring-1 transition-shadow hover:shadow-md',
            isExisting ? 'ring-green-100' : 'ring-amber-100',
        )}>
            {/* Top colored strip */}
            <div className={cn(
                'absolute inset-x-0 top-0 h-1',
                isExisting ? 'bg-motriks' : 'bg-amber-400',
            )} />

            <div className="flex items-start justify-between gap-2 pt-1">
                <div className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1',
                    isExisting
                        ? 'bg-motriks-soft ring-green-100'
                        : 'bg-amber-50 ring-amber-100',
                )}>
                    {isExisting
                        ? <Store className="size-5 text-motriks" />
                        : <MapPin className="size-5 text-amber-500" />}
                </div>

                {canEdit && (
                    <button
                        onClick={onDelete}
                        className="rounded-lg p-1.5 text-slate-200 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                        aria-label="Supprimer"
                    >
                        <Trash2 className="size-4" />
                    </button>
                )}
            </div>

            <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{site.name}</p>
                {(site.address || site.city) && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                        {[site.address, site.city].filter(Boolean).join(', ')}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                <Users className="size-3.5 text-slate-400" />
                <span className="font-medium text-slate-600 tabular-nums">{site.hostesses_count}</span>
                <span className="text-slate-400">hôtesse{site.hostesses_count > 1 ? 's' : ''}</span>
                <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: isExisting ? '#ecfdf3' : '#fffbeb', color: isExisting ? '#039855' : '#b45309' }}>
                    {isExisting ? 'PDV lié' : 'Stand'}
                </span>
            </div>
        </div>
    );
}

export function TabPdv({ event, companySites }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [mode, setMode] = useState<'existing' | 'new'>('existing');

    const { data, setData, post, processing, reset, errors } = useForm({
        site_id: '',
        name:    '',
        address: '',
        city:    '',
    });

    const canEdit    = !['completed', 'archived'].includes(event.status);
    const usedSiteIds = event.sites.map((s) => s.site_id).filter(Boolean);
    const available  = companySites.filter((s) => !usedSiteIds.includes(s.id));

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(siteStore({ event: event.id }).url, {
            onSuccess: () => { reset(); setShowForm(false); },
        });
    }

    return (
        <div className="flex flex-col gap-4">
            {canEdit && (
                <div className="flex justify-end">
                    <ActionButton icon={<Plus />} onClick={() => setShowForm(!showForm)} variant="secondary">
                        Ajouter un PDV
                    </ActionButton>
                </div>
            )}

            {showForm && (
                <GlowCard contentClassName="p-5" className="max-w-2xl">
                    <div className="mb-4 flex gap-2">
                        {(['existing', 'new'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                                    mode === m
                                        ? 'border-motriks bg-motriks-soft text-motriks-deep'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300',
                                )}
                            >
                                {m === 'existing' ? <><Store className="size-4" /> PDV existant</> : <><MapPin className="size-4" /> Nouveau stand</>}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="flex flex-col gap-3">
                        {mode === 'existing' ? (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-ink">Point de vente</label>
                                {available.length === 0 ? (
                                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-400 italic">
                                        Tous les PDV actifs sont déjà ajoutés.
                                    </p>
                                ) : (
                                    <SelectInput
                                        value={data.site_id}
                                        onChange={(e) => setData('site_id', e.target.value)}
                                        error={errors.site_id}
                                    >
                                        <option value="">-- Choisir --</option>
                                        {available.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} — {s.city}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Nom du stand</label>
                                    <TextInput
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="ex. Stand B12"
                                        error={errors.name}
                                    />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">Adresse / Hall</label>
                                        <TextInput
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            placeholder="Hall 3, Allée B"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">Ville</label>
                                        <TextInput
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                            placeholder="Yaoundé"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                            <ActionButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                Annuler
                            </ActionButton>
                            <ActionButton type="submit" icon={<Plus />} loading={processing}>
                                Ajouter
                            </ActionButton>
                        </div>
                    </form>
                </GlowCard>
            )}

            {event.sites.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                        <MapPin className="size-6 text-blue-400" />
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-700">Aucun point de vente</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">
                        Ajoutez les PDV existants ou créez des stands spécifiques à cet événement.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {event.sites.map((site) => (
                        <PdvCard
                            key={site.id}
                            site={site}
                            canEdit={canEdit}
                            onDelete={() => router.delete(siteDestroy({ event: event.id, eventSite: site.id }).url)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
