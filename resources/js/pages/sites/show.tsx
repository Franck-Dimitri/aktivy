import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarRange,
    Clock,
    MapPin,
    Pencil,
    Phone,
    Store,
    Timer,
    Trash2,
    User,
} from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import {
    index as sitesIndex,
    edit as siteEdit,
    show as siteShow,
    destroy as siteDestroy,
} from '@/routes/sites';
import { dashboard } from '@/routes';
import type { SiteAffectation, SiteDetail, SiteVisit } from '@/types';

type Props = {
    site: SiteDetail;
    affectations: SiteAffectation[];
    recent_visits: SiteVisit[];
};

const statusTone: Record<string, StatusTone> = {
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-ink">{value}</dd>
        </div>
    );
}

function formatDuration(minutes: number | null): string {
    if (minutes === null) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function SiteShow({ site, affectations, recent_visits }: Props) {
    const confirmDelete = () => {
        if (confirm(`Archiver « ${site.name} » ? Les affectations et visites associées seront conservées.`)) {
            router.delete(siteDestroy(site.id).url);
        }
    };

    return (
        <>
            <Head title={site.name} />

            <Page
                title={site.name}
                description={[site.type_label, site.city, site.region].filter(Boolean).join(' · ')}
                actions={
                    <div className="flex items-center gap-2">
                        <Link
                            href={siteEdit(site.id).url}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            <Pencil className="size-3.5" />
                            Modifier
                        </Link>
                        <button
                            onClick={confirmDelete}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        >
                            <Trash2 className="size-3.5" />
                            Archiver
                        </button>
                    </div>
                }
            >
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Colonne principale */}
                    <div className="flex flex-col gap-6 lg:col-span-2">
                        {/* Informations générales */}
                        <Panel title="Informations">
                            <dl className="divide-y divide-slate-100 px-5">
                                <InfoRow label="Statut" value={undefined} />
                                <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                    <dt className="text-slate-500">Statut</dt>
                                    <dd>
                                        <StatusBadge tone={statusTone[site.status] ?? 'neutral'}>
                                            {site.status_label}
                                        </StatusBadge>
                                    </dd>
                                </div>
                                <InfoRow label="Code interne" value={site.code} />
                                <InfoRow label="Type" value={site.type_label} />
                                <InfoRow label="Adresse" value={site.address} />
                                <InfoRow label="Ville" value={site.city} />
                                <InfoRow label="Région" value={site.region} />
                                {(site.latitude && site.longitude) && (
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">GPS</dt>
                                        <dd className="font-mono text-xs text-slate-600">
                                            {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                                        </dd>
                                    </div>
                                )}
                                <InfoRow label="Ouverture" value={site.opening_time && site.closing_time
                                    ? `${site.opening_time} – ${site.closing_time}`
                                    : (site.opening_time ?? null)} />
                                <InfoRow label="Dernière visite" value={site.last_visit_at ?? 'Jamais'} />
                            </dl>
                        </Panel>

                        {/* Contact sur place */}
                        {(site.contact_name || site.contact_phone) && (
                            <Panel title="Contact sur place">
                                <div className="flex items-center gap-4 p-5">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <User className="size-5" />
                                    </div>
                                    <div>
                                        {site.contact_name && (
                                            <p className="text-sm font-semibold text-ink">{site.contact_name}</p>
                                        )}
                                        {site.contact_phone && (
                                            <a
                                                href={`tel:${site.contact_phone}`}
                                                className="flex items-center gap-1 text-sm text-aktivy-deep hover:underline"
                                            >
                                                <Phone className="size-3.5" />
                                                {site.contact_phone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </Panel>
                        )}

                        {/* Notes */}
                        {site.notes && (
                            <Panel title="Notes internes">
                                <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-600">
                                    {site.notes}
                                </p>
                            </Panel>
                        )}

                        {/* Visites récentes */}
                        <Panel
                            title="Visites récentes"
                            description="Les 10 dernières prises de poste sur ce site."
                        >
                            {recent_visits.length === 0 ? (
                                <EmptyState
                                    icon={Timer}
                                    title="Aucune visite enregistrée"
                                    description="Les pointages de vos hôtesses apparaîtront ici."
                                />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {recent_visits.map((visit) => (
                                        <li key={visit.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-ink">{visit.agent_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {visit.checked_in_at}
                                                    {visit.checked_out_at && ` → ${visit.checked_out_at}`}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3">
                                                {visit.duration_minutes !== null && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Clock className="size-3" />
                                                        {formatDuration(visit.duration_minutes)}
                                                    </span>
                                                )}
                                                <StatusBadge tone={statusTone[visit.status] ?? 'neutral'}>
                                                    {visit.status_label}
                                                </StatusBadge>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    {/* Colonne latérale */}
                    <div className="flex flex-col gap-6">
                        {/* Affectations actives */}
                        <Panel
                            title="Affectées actuellement"
                            actions={
                                <span className="text-sm text-slate-400">{affectations.length}</span>
                            }
                        >
                            {affectations.length === 0 ? (
                                <EmptyState
                                    icon={CalendarRange}
                                    title="Aucune affectation"
                                    description="Personne n'est encore affecté à ce site."
                                />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {affectations.map((a) => (
                                        <li key={a.id} className="px-5 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-aktivy-deep">
                                                    <User className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-ink">{a.agent_name}</p>
                                                    {a.agent_phone && (
                                                        <p className="text-xs text-slate-500">{a.agent_phone}</p>
                                                    )}
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        Depuis le {a.starts_on}
                                                        {a.ends_on && ` · jusqu'au ${a.ends_on}`}
                                                    </p>
                                                    {(a.slot_start && a.slot_end) && (
                                                        <p className="text-xs text-slate-400">
                                                            <Clock className="mr-1 inline size-3" />
                                                            {a.slot_start} – {a.slot_end}
                                                        </p>
                                                    )}
                                                </div>
                                                {a.is_current && (
                                                    <StatusBadge tone="success">Actif</StatusBadge>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        {/* Carte */}
                        {site.latitude && site.longitude && (
                            <Panel title="Localisation">
                                <div className="p-5">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MapPin className="size-4 text-aktivy" />
                                        <span className="font-mono text-xs">
                                            {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
                                        </span>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex text-xs font-semibold text-aktivy-deep underline-offset-2 hover:underline"
                                    >
                                        Voir sur Google Maps →
                                    </a>
                                </div>
                            </Panel>
                        )}
                    </div>
                </div>
            </Page>
        </>
    );
}

SiteShow.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};
