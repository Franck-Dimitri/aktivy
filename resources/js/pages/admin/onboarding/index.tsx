import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, Building2, CheckCircle2, Clock, FileText } from 'lucide-react';
import { GlowCard } from '@/components/page/surface';
import { Page, Panel } from '@/components/page/page';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as onboardingIndex, show as onboardingShow } from '@/routes/admin/onboarding';

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

const STATUS_CONFIG = {
    pending:  { label: 'En attente',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
    rejected: { label: 'Rejeté',      color: 'bg-red-100 text-red-600',      icon: AlertCircle },
};

export default function AdminOnboardingIndex({ companies, incomplete, flash }: Props) {
    return (
        <>
            <Head title="Demandes d'inscription" />

            <Page
                title="Demandes d'inscription entreprises"
                description="Examinez les dossiers soumis et activez les nouveaux espaces clients."
            >
                {flash?.success && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-aktivy-soft px-4 py-3 text-sm font-medium text-aktivy-deep">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {flash.success}
                    </div>
                )}

                {incomplete > 0 && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <Clock className="size-4 shrink-0" />
                        <span><strong>{incomplete}</strong> entreprise{incomplete > 1 ? 's ont' : ' a'} créé un compte mais n'a pas encore soumis son dossier.</span>
                    </div>
                )}

                <Panel title={`Dossiers soumis (${companies.length})`}>
                    {companies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                                <Building2 className="size-6 text-slate-300" />
                            </div>
                            <p className="mt-4 text-sm font-bold text-slate-700">Aucun dossier en attente</p>
                            <p className="mt-1 text-xs text-slate-400">Les nouvelles demandes apparaîtront ici.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {companies.map((c) => {
                                const config = STATUS_CONFIG[c.status];
                                const Icon   = config.icon;
                                return (
                                    <Link
                                        key={c.id}
                                        href={onboardingShow({ company: c.id }).url}
                                        className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/70"
                                    >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                            <Building2 className="size-5 text-slate-400" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-slate-900">{c.name}</p>
                                            <p className="mt-0.5 truncate text-xs text-slate-400">
                                                {[c.admin_name, c.admin_email].filter(Boolean).join(' — ')}
                                            </p>
                                            {c.sector && <p className="mt-0.5 text-xs text-slate-400">{c.sector} · {c.city}</p>}
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', config.color)}>
                                                <Icon className="size-3" />
                                                {config.label}
                                            </span>
                                            <p className="mt-1 text-[11px] text-slate-400">{c.onboarding_completed_at}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            </Page>
        </>
    );
}

AdminOnboardingIndex.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Demandes d\'inscription', href: onboardingIndex() },
    ],
};
