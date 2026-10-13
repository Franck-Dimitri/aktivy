import { Head, useForm } from '@inertiajs/react';
import {
    Building2,
    Clock,
    FileText,
    MapPin,
    Phone,
    Store,
    Tag,
    User,
} from 'lucide-react';
import { Page, Panel } from '@/components/page/page';
import {
    index as sitesIndex,
    show as siteShow,
    update as siteUpdate,
    edit as siteEdit,
} from '@/routes/sites';
import { dashboard } from '@/routes';
import type { SiteFormData, SiteStatusOption, SiteTypeOption } from '@/types';

type Props = {
    site: SiteFormData & { id: number };
    types: SiteTypeOption[];
    statuses: SiteStatusOption[];
};

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';

const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function SiteEdit({ site, types, statuses }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: site.name,
        code: site.code ?? '',
        type: site.type,
        address: site.address ?? '',
        city: site.city,
        region: site.region ?? '',
        latitude: site.latitude?.toString() ?? '',
        longitude: site.longitude?.toString() ?? '',
        contact_name: site.contact_name ?? '',
        contact_phone: site.contact_phone ?? '',
        opening_time: site.opening_time ?? '',
        closing_time: site.closing_time ?? '',
        notes: site.notes ?? '',
        status: site.status ?? 'active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(siteUpdate(site.id).url);
    };

    return (
        <>
            <Head title={`Modifier — ${site.name}`} />

            <Page title={`Modifier : ${site.name}`}>
                <form onSubmit={submit} className="flex flex-col gap-6">
                    {/* Identité */}
                    <Panel title="Identité du site">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="name" className={labelClass}>
                                    Nom du site <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Store className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                        required
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="code" className={labelClass}>
                                    Code interne
                                </label>
                                <div className="relative">
                                    <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="code"
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        className={`${fieldClass} pl-9 font-mono`}
                                        maxLength={30}
                                    />
                                </div>
                                {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                            </div>

                            <div>
                                <label htmlFor="type" className={labelClass}>
                                    Type de commerce <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="type"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value as typeof data.type)}
                                    className={fieldClass}
                                >
                                    {types.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="status" className={labelClass}>
                                    Statut <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value as typeof data.status)}
                                    className={fieldClass}
                                >
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Localisation */}
                    <Panel title="Localisation">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="address" className={labelClass}>Adresse</label>
                                <div className="relative">
                                    <Building2 className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
                                    <textarea
                                        id="address"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        rows={2}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pl-9 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="city" className={labelClass}>
                                    Ville <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="city"
                                        type="text"
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                        required
                                    />
                                </div>
                                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                            </div>

                            <div>
                                <label htmlFor="region" className={labelClass}>Région</label>
                                <input
                                    id="region"
                                    type="text"
                                    value={data.region}
                                    onChange={(e) => setData('region', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="latitude" className={labelClass}>Latitude GPS</label>
                                <input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={data.latitude}
                                    onChange={(e) => setData('latitude', e.target.value)}
                                    className={`${fieldClass} font-mono`}
                                />
                            </div>

                            <div>
                                <label htmlFor="longitude" className={labelClass}>Longitude GPS</label>
                                <input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={data.longitude}
                                    onChange={(e) => setData('longitude', e.target.value)}
                                    className={`${fieldClass} font-mono`}
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* Contact */}
                    <Panel title="Contact sur place">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="contact_name" className={labelClass}>Responsable</label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="contact_name"
                                        type="text"
                                        value={data.contact_name}
                                        onChange={(e) => setData('contact_name', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="contact_phone" className={labelClass}>Téléphone</label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="contact_phone"
                                        type="tel"
                                        value={data.contact_phone}
                                        onChange={(e) => setData('contact_phone', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* Horaires */}
                    <Panel title="Horaires d'ouverture">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="opening_time" className={labelClass}>Ouverture</label>
                                <div className="relative">
                                    <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="opening_time"
                                        type="time"
                                        value={data.opening_time}
                                        onChange={(e) => setData('opening_time', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="closing_time" className={labelClass}>Fermeture</label>
                                <div className="relative">
                                    <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="closing_time"
                                        type="time"
                                        value={data.closing_time}
                                        onChange={(e) => setData('closing_time', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* Notes */}
                    <Panel title="Notes internes">
                        <div className="p-5">
                            <div className="relative">
                                <FileText className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
                                <textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pl-9 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15"
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <a
                            href={siteShow(site.id).url}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-60"
                        >
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

SiteEdit.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};
