import { Head, Link } from '@inertiajs/react';
import { AlertCircle, Building2, CheckCircle2, Clock, Info } from 'lucide-react';
import { Page, Panel } from '@/components/page/page';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as onboardingIndex, show as onboardingShow } from '@/routes/admin/onboarding';

type Company = {
    id: number; name: string; sector: string | null; city: string | null;
    status: 'pending' | 'rejected'; onboarding_completed_at: string;
    admin_name: string | null; admin_email: string | null; rejection_reason: string | null;
};

type Props = {
    companies: Company[];
    incomplete: number;
    flash?: { success?: string };
};

const STATUS: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
    pending:  { label: 'En attente',  cls: 'bg-amber-50 text-amber-700 ring-amber-200/60',  icon: Clock },
    rejected: { label: 'Rejeté',      cls: 'bg-red-50   text-red-600   ring-red-200/60',    icon: AlertCircle },
};

export default function AdminOnboardingIndex({ companies, incomplete, flash }: Props) {
    const pending  = companies.filter((c) => c.status === 'pending').length;
    const rejected = companies.filter((c) => c.status === 'rejected').length;

    return (
        <>
            <Head title="Demandes d'inscription" />

            <Page
                title="Demandes d'inscription"
                description="Examinez les dossiers soumis et activez les nouveaux espaces clients."
            >
                {/* Flash */}
                {flash?.success && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* Stats row */}
                <div className="mb-5 grid grid-cols-3 gap-4">
                    {[
                        { label: 'Dossiers soumis',              value: companies.length, color: 'text-ink' },
                        { label: 'En attente de validation',      value: pending,          color: 'text-amber-600' },
                        { label: 'Inscriptions incomplètes',      value: incomplete,       color: 'text-slate-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.03]">
                            <p className={cn('text-2xl font-extrabold tabular-nums', color)}>{value}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                        </div>
                    ))}
                </div>

                {incomplete > 0 && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <Info className="mt-px size-4 shrink-0 text-slate-400" />
                        <span>
                            <strong>{incomplete}</strong> entreprise{incomplete > 1 ? 's ont' : ' a'} créé un compte mais n'a pas encore soumis ses documents.
                        </span>
                    </div>
                )}

                <Panel title={companies.length > 0 ? `${companies.length} dossier${companies.length > 1 ? 's' : ''}` : 'Dossiers soumis'}>
                    {companies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 shadow-sm">
                                <Building2 className="size-5 text-slate-300" />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-slate-700">Aucun dossier en attente</p>
                            <p className="mt-1 text-xs text-slate-400">Les nouvelles demandes apparaîtront ici.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {companies.map((c) => {
                                const s = STATUS[c.status];
                                const Icon = s.icon;
                                return (
                                    <Link
                                        key={c.id}
                                        href={onboardingShow({ company: c.id }).url}
                                        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                                    >
                                        {/* Avatar */}
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-400 text-sm group-hover:bg-slate-200 transition-colors">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                            <p className="mt-0.5 truncate text-xs text-slate-400">
                                                {c.admin_name}
                                                {c.admin_email && <> · <span className="font-mono">{c.admin_email}</span></>}
                                            </p>
                                            {(c.sector || c.city) && (
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {[c.sector, c.city].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status + date */}
                                        <div className="shrink-0 text-right">
                                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', s.cls)}>
                                                <Icon className="size-3" />
                                                {s.label}
                                            </span>
                                            <p className="mt-1.5 text-[11px] text-slate-400">{c.onboarding_completed_at}</p>
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
