import { Head, Link, router } from '@inertiajs/react';
import { Building2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { index as companiesIndex, reactivate, suspend } from '@/routes/admin/companies';
import { show as onboardingShow } from '@/routes/admin/onboarding';

type Company = {
    id: number;
    name: string;
    city: string | null;
    email: string | null;
    status: 'active' | 'pending' | 'rejected' | 'suspended';
    users_count: number;
    sites_count: number;
    last_report: string | null;
    created_at: string | null;
};

const status: Record<Company['status'], { tone: StatusTone; label: string }> = {
    active: { tone: 'success', label: 'Active' },
    pending: { tone: 'info', label: 'En attente' },
    rejected: { tone: 'warning', label: 'Rejetée' },
    suspended: { tone: 'danger', label: 'Suspendue' },
};

export default function AdminCompanies({ companies }: { companies: Company[] }) {
    const [query, setQuery] = useState('');

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();

        return q ? companies.filter((c) => `${c.name} ${c.city ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q)) : companies;
    }, [companies, query]);

    const toggle = (company: Company) => {
        const suspending = company.status === 'active';
        const question = suspending
            ? `Suspendre « ${company.name} » ? Tous ses utilisateurs seront déconnectés et ne pourront plus entrer.`
            : `Réactiver « ${company.name} » ?`;

        if (!confirm(question)) return;

        router.post((suspending ? suspend(company.id) : reactivate(company.id)).url, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(suspending ? 'Entreprise suspendue' : 'Entreprise réactivée'),
        });
    };

    return (
        <>
            <Head title="Entreprises" />

            <Page title="Entreprises" description={`${companies.length} entreprise${companies.length > 1 ? 's' : ''} sur la plateforme.`}>
                <div className="flex flex-col gap-4">
                    <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom, ville ou e-mail" aria-label="Rechercher" />

                    <Panel>
                        {shown.length === 0 ? (
                            <div className="p-10">
                                <EmptyState icon={Building2} title="Aucune entreprise" description="Aucune entreprise ne correspond à cette recherche." />
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {shown.map((c) => (
                                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-ink">{c.name}</p>
                                                <StatusBadge tone={status[c.status].tone}>{status[c.status].label}</StatusBadge>
                                            </div>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {[c.city, c.email].filter(Boolean).join(' · ')}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {c.users_count} utilisateur{c.users_count > 1 ? 's' : ''} · {c.sites_count} site{c.sites_count > 1 ? 's' : ''} · inscrite le {c.created_at}
                                                {c.last_report ? ` · dernier rapport le ${c.last_report}` : ' · aucun rapport'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={onboardingShow(c.id).url} className="text-xs font-semibold text-motriks-deep hover:underline">
                                                Dossier
                                            </Link>
                                            {c.status === 'active' && (
                                                <ActionButton variant="secondary" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => toggle(c)}>
                                                    Suspendre
                                                </ActionButton>
                                            )}
                                            {c.status === 'suspended' && (
                                                <ActionButton size="sm" onClick={() => toggle(c)}>
                                                    Réactiver
                                                </ActionButton>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </Page>
        </>
    );
}

AdminCompanies.layout = {
    breadcrumbs: [{ title: 'Entreprises', href: companiesIndex().url }],
};
