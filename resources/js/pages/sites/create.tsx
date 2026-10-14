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
import { index as sitesIndex, store as siteStore, create as siteCreate } from '@/routes/sites';
import { dashboard } from '@/routes';
import type { SiteTypeOption } from '@/types';

type Props = {
    types: SiteTypeOption[];
};

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';

const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function SiteCreate({ types }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        type: 'autre' as string,
        address: '',
        city: 'Yaoundé',
        region: '',
        latitude: '',
        longitude: '',
        contact_name: '',
        contact_phone: '',
        opening_time: '',
        closing_time: '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(siteStore().url);
    };

    return (
        <>
            <Head title="Nouveau site" />

            <Page title="Nouveau site" description="Ajoutez un point de vente à votre réseau.">
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
                                        placeholder="Ex. : Santa Lucia Ngousso"
                                        className={`${fieldClass} pl-9`}
                                        required
                                        autoFocus
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="code" className={labelClass}>
                                    Code interne
                                    <span className="ml-1 text-xs font-normal text-slate-400">(optionnel)</span>
                                </label>
                                <div className="relative">
                                    <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="code"
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        placeholder="Ex. : SL-NGO-01"
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
                                    onChange={(e) => setData('type', e.target.value)}
                                    className={fieldClass}
                                >
                                    {types.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Localisation */}
                    <Panel title="Localisation">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="address" className={labelClass}>
                                    Adresse
                                </label>
                                <div className="relative">
                                    <Building2 className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
                                    <textarea
                                        id="address"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        placeholder="Rue, quartier, repère…"
                                        rows={2}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pl-9 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15"
                                    />
                                </div>
                                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
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
                                        placeholder="Yaoundé"
                                        className={`${fieldClass} pl-9`}
                                        required
                                    />
                                </div>
                                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                            </div>

                            <div>
                                <label htmlFor="region" className={labelClass}>
                                    Région / Province
                                </label>
                                <input
                                    id="region"
                                    type="text"
                                    value={data.region}
                                    onChange={(e) => setData('region', e.target.value)}
                                    placeholder="Ex. : Centre"
                                    className={fieldClass}
                                />
                                {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region}</p>}
                            </div>

                            <div>
                                <label htmlFor="latitude" className={labelClass}>
                                    Latitude GPS
                                    <span className="ml-1 text-xs font-normal text-slate-400">(optionnel)</span>
                                </label>
                                <input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={data.latitude}
                                    onChange={(e) => setData('latitude', e.target.value)}
                                    placeholder="3.8721"
                                    className={`${fieldClass} font-mono`}
                                />
                                {errors.latitude && <p className="mt-1 text-xs text-red-600">{errors.latitude}</p>}
                            </div>

                            <div>
                                <label htmlFor="longitude" className={labelClass}>
                                    Longitude GPS
                                    <span className="ml-1 text-xs font-normal text-slate-400">(optionnel)</span>
                                </label>
                                <input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={data.longitude}
                                    onChange={(e) => setData('longitude', e.target.value)}
                                    placeholder="11.5174"
                                    className={`${fieldClass} font-mono`}
                                />
                                {errors.longitude && <p className="mt-1 text-xs text-red-600">{errors.longitude}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Contact sur place */}
                    <Panel title="Contact sur place">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="contact_name" className={labelClass}>
                                    Responsable
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="contact_name"
                                        type="text"
                                        value={data.contact_name}
                                        onChange={(e) => setData('contact_name', e.target.value)}
                                        placeholder="Nom du responsable de rayon"
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.contact_name && <p className="mt-1 text-xs text-red-600">{errors.contact_name}</p>}
                            </div>

                            <div>
                                <label htmlFor="contact_phone" className={labelClass}>
                                    Téléphone
                                </label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="contact_phone"
                                        type="tel"
                                        value={data.contact_phone}
                                        onChange={(e) => setData('contact_phone', e.target.value)}
                                        placeholder="+237 6XX XXX XXX"
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.contact_phone && <p className="mt-1 text-xs text-red-600">{errors.contact_phone}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Horaires */}
                    <Panel title="Horaires d'ouverture">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="opening_time" className={labelClass}>
                                    Ouverture
                                </label>
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
                                {errors.opening_time && <p className="mt-1 text-xs text-red-600">{errors.opening_time}</p>}
                            </div>

                            <div>
                                <label htmlFor="closing_time" className={labelClass}>
                                    Fermeture
                                </label>
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
                                {errors.closing_time && <p className="mt-1 text-xs text-red-600">{errors.closing_time}</p>}
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
                                    placeholder="Informations utiles : accès, parking, badge d'entrée…"
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pl-9 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15"
                                />
                            </div>
                            {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                        </div>
                    </Panel>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <a
                            href={sitesIndex().url}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-60"
                        >
                            {processing ? 'Enregistrement…' : 'Créer le site'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

SiteCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
        { title: 'Nouveau site', href: siteCreate() },
    ],
};
