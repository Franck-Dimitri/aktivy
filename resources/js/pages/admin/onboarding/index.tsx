import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, CheckCircle2, ChevronRight, CircleDashed, Clock, FileX2, Inbox, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buttonClass } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as companiesIndex } from '@/routes/admin/companies';
import { index as onboardingIndex, show as onboardingShow } from '@/routes/admin/onboarding';
import { CompanyAvatar, MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';

type Company = {
    id: number;
    name: string;
    sector: string | null;
    city: string | null;
    status: 'pending' | 'rejected';
    onboarding_completed_at: string;
    admin_name: string | null;
    admin_email: string | null;
    rejection_reason: string | null;
};

type Props = {
    companies: Company[];
    incomplete: number;
    flash?: { success?: string };
};

type Filter = 'all' | Company['status'];

export default function AdminOnboardingIndex({ companies, incomplete, flash }: Props) {
    const [filter, setFilter] = useState<Filter>('pending');
    const [query, setQuery] = useState('');

    const pending = companies.filter((c) => c.status === 'pending').length;
    const rejected = companies.length - pending;

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return companies.filter(
            (c) =>
                (filter === 'all' || c.status === filter) &&
                (!q || `${c.name} ${c.admin_name ?? ''} ${c.admin_email ?? ''} ${c.city ?? ''} ${c.sector ?? ''}`.toLowerCase().includes(q)),
        );
    }, [companies, filter, query]);

    return (
        <>
            <Head title="Demandes d'inscription" />

            <Page
                title="Demandes d'inscription"
                description="Examinez les dossiers soumis et activez les nouveaux espaces clients."
               
                actions={
                    <Link href={companiesIndex().url} className={buttonClass('secondary', 'md')}>
                        <Building2 />
                        Toutes les entreprises
                    </Link>
                }
            >
                {flash?.success && (
                    <div className="flex items-center gap-3 rounded-xl bg-motriks-soft px-4 py-3 text-sm font-medium text-motriks-deep ring-1 ring-motriks/15">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {flash.success}
                    </div>
                )}

                <MetricRow
                    items={[
                        { label: 'À examiner', value: pending, hint: pending ? 'En attente de votre décision' : 'Rien en attente', icon: Clock, tone: pending ? 'amber' : 'default', pulse: true },
                        { label: 'Rejetés', value: rejected, hint: 'En attente d’un nouvel envoi', icon: FileX2, tone: rejected ? 'red' : 'default' },
                        { label: 'Inscriptions incomplètes', value: incomplete, hint: 'Compte créé, documents non envoyés', icon: CircleDashed },
                    ]}
                />

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sidebar-border">
                        <Segmented
                            label="Filtrer par statut"
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { value: 'pending', label: 'À examiner', count: pending },
                                { value: 'rejected', label: 'Rejetés', count: rejected },
                                { value: 'all', label: 'Tous', count: companies.length },
                            ]}
                        />
                        {companies.length > 0 && (
                            <div className="sm:w-72">
                                <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Entreprise, gérant, ville…" aria-label="Rechercher un dossier" className="h-9" />
                            </div>
                        )}
                    </div>

                    {shown.length === 0 ? (
                        companies.length === 0 || (!query && filter === 'pending') ? (
                            <QuietEmpty
                                icon={Inbox}
                                title={companies.length === 0 ? 'Aucun dossier pour le moment' : 'Tout est traité'}
                                action={
                                    <Link href={companiesIndex().url} className={buttonClass('ghost', 'sm', 'text-motriks-deep')}>
                                        Voir les entreprises actives
                                        <ArrowRight />
                                    </Link>
                                }
                            >
                                {incomplete > 0
                                    ? `${incomplete} entreprise${incomplete > 1 ? 's ont' : ' a'} créé un compte sans encore envoyer ses documents. Leur dossier apparaîtra ici dès l’envoi.`
                                    : 'Les nouvelles demandes apparaîtront ici dès qu’une entreprise aura envoyé ses documents.'}
                            </QuietEmpty>
                        ) : (
                            <QuietEmpty icon={Search} title="Aucun dossier ne correspond">
                                Modifiez la recherche ou le filtre.
                            </QuietEmpty>
                        )
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                            {shown.map((c) => (
                                <li key={c.id}>
                                    <Link
                                        href={onboardingShow({ company: c.id }).url}
                                        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5 dark:hover:bg-white/[0.03]"
                                    >
                                        <CompanyAvatar name={c.name} muted={c.status === 'rejected'} />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                                {c.sector && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/5">{c.sector}</span>}
                                            </div>
                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                {[c.admin_name, c.admin_email, c.city].filter(Boolean).join(' · ') || 'Gérant non renseigné'}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                                                <StatusBadge tone={c.status === 'pending' ? 'warning' : 'danger'}>{c.status === 'pending' ? 'À examiner' : 'Rejeté'}</StatusBadge>
                                                <span className="text-[11px] text-slate-400 tabular-nums">{c.onboarding_completed_at}</span>
                                            </div>
                                            {c.status === 'rejected' && c.rejection_reason && (
                                                <p className="mt-1.5 line-clamp-1 text-xs text-red-600/90">
                                                    <span className="font-semibold">Motif :</span> {c.rejection_reason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                                            <StatusBadge tone={c.status === 'pending' ? 'warning' : 'danger'}>{c.status === 'pending' ? 'À examiner' : 'Rejeté'}</StatusBadge>
                                            <span className="text-[11px] text-slate-400 tabular-nums">Soumis le {c.onboarding_completed_at}</span>
                                        </div>

                                        <ChevronRight className={cn('size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500')} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </Page>
        </>
    );
}

AdminOnboardingIndex.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: "Demandes d'inscription", href: onboardingIndex() },
    ],
};
