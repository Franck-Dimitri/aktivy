import { Head, useForm } from '@inertiajs/react';
import { CalendarRange, Clock, FileText, MapPin, User } from 'lucide-react';
import { Page, Panel } from '@/components/page/page';
import {
    index as affectationsIndex,
    store as affectationStore,
    create as affectationCreate,
} from '@/routes/affectations';
import { dashboard } from '@/routes';
import type { AffectationSelectOption } from '@/types';

type Props = {
    sites: AffectationSelectOption[];
    staff: AffectationSelectOption[];
    default_site_id: number | null;
    default_agent_id: number | null;
};

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';
const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function AffectationCreate({ sites, staff, default_site_id, default_agent_id }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        site_id:    default_site_id ?? ('' as number | ''),
        user_id:    default_agent_id ?? ('' as number | ''),
        starts_on:  '',
        ends_on:    '',
        slot_start: '',
        slot_end:   '',
        notes:      '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(affectationStore().url);
    };

    return (
        <>
            <Head title="Nouvelle affectation" />

            <Page
                title="Nouvelle affectation"
                description="Assigner un membre à un point de vente."
            >
                <form onSubmit={submit} className="flex flex-col gap-6">
                    {/* Qui → Où */}
                    <Panel title="Affectation">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            {/* Agent */}
                            <div>
                                <label htmlFor="user_id" className={labelClass}>
                                    Membre <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <select
                                        id="user_id"
                                        value={data.user_id}
                                        onChange={(e) => setData('user_id', Number(e.target.value) || '')}
                                        className={`${fieldClass} pl-9`}
                                        required
                                    >
                                        <option value="">Choisir un membre…</option>
                                        {staff.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label} ({s.role_label})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.user_id && <p className="mt-1 text-xs text-red-600">{errors.user_id}</p>}
                            </div>

                            {/* Site */}
                            <div>
                                <label htmlFor="site_id" className={labelClass}>
                                    Site <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <select
                                        id="site_id"
                                        value={data.site_id}
                                        onChange={(e) => setData('site_id', Number(e.target.value) || '')}
                                        className={`${fieldClass} pl-9`}
                                        required
                                    >
                                        <option value="">Choisir un site…</option>
                                        {sites.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {errors.site_id && <p className="mt-1 text-xs text-red-600">{errors.site_id}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Période */}
                    <Panel title="Période">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="starts_on" className={labelClass}>
                                    Date de début <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <CalendarRange className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="starts_on"
                                        type="date"
                                        value={data.starts_on}
                                        onChange={(e) => setData('starts_on', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                        required
                                    />
                                </div>
                                {errors.starts_on && <p className="mt-1 text-xs text-red-600">{errors.starts_on}</p>}
                            </div>

                            <div>
                                <label htmlFor="ends_on" className={labelClass}>
                                    Date de fin
                                    <span className="ml-1 text-xs font-normal text-slate-400">(vide = permanent)</span>
                                </label>
                                <div className="relative">
                                    <CalendarRange className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="ends_on"
                                        type="date"
                                        value={data.ends_on}
                                        onChange={(e) => setData('ends_on', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.ends_on && <p className="mt-1 text-xs text-red-600">{errors.ends_on}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Créneau horaire */}
                    <Panel title="Créneau horaire" >
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <p className="sm:col-span-2 text-sm text-slate-500">
                                Optionnel. Précise les heures de prise de poste attendues.
                            </p>
                            <div>
                                <label htmlFor="slot_start" className={labelClass}>Heure de début</label>
                                <div className="relative">
                                    <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="slot_start"
                                        type="time"
                                        value={data.slot_start}
                                        onChange={(e) => setData('slot_start', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.slot_start && <p className="mt-1 text-xs text-red-600">{errors.slot_start}</p>}
                            </div>

                            <div>
                                <label htmlFor="slot_end" className={labelClass}>Heure de fin</label>
                                <div className="relative">
                                    <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="slot_end"
                                        type="time"
                                        value={data.slot_end}
                                        onChange={(e) => setData('slot_end', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.slot_end && <p className="mt-1 text-xs text-red-600">{errors.slot_end}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Notes */}
                    <Panel title="Notes internes">
                        <div className="p-5">
                            <div className="relative">
                                <FileText className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" />
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={3}
                                    placeholder="Instructions particulières, contexte…"
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15"
                                />
                            </div>
                            {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                        </div>
                    </Panel>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <a
                            href={affectationsIndex().url}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-60"
                        >
                            {processing ? 'Enregistrement…' : 'Créer l\'affectation'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

AffectationCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Affectations', href: affectationsIndex() },
        { title: 'Nouvelle', href: affectationCreate() },
    ],
};
