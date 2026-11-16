import { Building2, Clock, MapPin, Phone, Timer, User } from 'lucide-react';
import { StatusBadge } from '@/components/page/status-badge';
import { type Props } from '@/components/sites/show/types';
import { statusTone, typeIcon } from '@/components/sites/show/constants';
import { Fact, muted } from '@/components/sites/show/ui';

/* ───────────── Identité du site ───────────── */

export function SiteIdentity({ site }: { site: Props['site'] }) {
    const TypeIcon = typeIcon[site.type] ?? Building2;
    const hasCoordinates = site.latitude != null && site.longitude != null;

    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-motriks-deep ring-1 ring-green-600/10 ring-inset">
                    <TypeIcon className="size-6" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                            tone={statusTone[site.status] ?? 'neutral'}
                        >
                            {site.status_label}
                        </StatusBadge>
                        <span className="text-sm text-slate-500">
                            {site.type_label}
                        </span>
                        {site.code && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                                {site.code}
                            </span>
                        )}
                    </div>

                    <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Fact icon={Building2} label="Adresse">
                            {site.address ? (
                                <>
                                    <span className="block">
                                        {site.address}
                                    </span>
                                    <span className="block text-xs font-normal text-slate-500">
                                        {[site.city, site.region]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                </>
                            ) : (
                                [site.city, site.region]
                                    .filter(Boolean)
                                    .join(' · ')
                            )}
                        </Fact>

                        <Fact icon={User} label="Contact sur place">
                            {site.contact_name || site.contact_phone ? (
                                <>
                                    {site.contact_name && (
                                        <span className="block">
                                            {site.contact_name}
                                        </span>
                                    )}
                                    {site.contact_phone && (
                                        <a
                                            href={`tel:${site.contact_phone}`}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-motriks-deep hover:underline"
                                        >
                                            <Phone className="size-3" />
                                            {site.contact_phone}
                                        </a>
                                    )}
                                </>
                            ) : (
                                muted
                            )}
                        </Fact>

                        <Fact icon={Clock} label="Horaires">
                            {site.opening_time || site.closing_time
                                ? [site.opening_time, site.closing_time]
                                      .filter(Boolean)
                                      .join(' – ')
                                : muted}
                        </Fact>

                        <Fact icon={MapPin} label="Localisation GPS">
                            {hasCoordinates ? (
                                <>
                                    <span className="block font-mono text-xs font-normal text-slate-600">
                                        {Number(site.latitude).toFixed(5)},{' '}
                                        {Number(site.longitude).toFixed(5)}
                                    </span>
                                    <a
                                        href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-motriks-deep hover:underline"
                                    >
                                        Voir sur la carte
                                    </a>
                                </>
                            ) : (
                                muted
                            )}
                        </Fact>

                        <Fact icon={Timer} label="Dernière visite">
                            {site.last_visit_at ?? (
                                <span className="font-normal text-slate-500">
                                    Jamais
                                </span>
                            )}
                        </Fact>
                    </div>

                    {site.notes && (
                        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                            {site.notes}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
