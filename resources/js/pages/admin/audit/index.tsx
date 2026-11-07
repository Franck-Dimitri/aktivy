import { Head, Link, router } from '@inertiajs/react';
import { Search, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { SelectInput, TextInput } from '@/components/page/form-fields';
import { QuietEmpty } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { auditLabel } from '@/lib/audit-actions';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as auditIndex } from '@/routes/admin/audit';
import { show as companyShow } from '@/routes/admin/companies';

type Log = {
    id: number;
    action: string;
    user: string | null;
    user_email: string | null;
    company_id: number | null;
    company: string | null;
    ip: string | null;
    at: string | null;
    details: string | null;
};

type Filters = {
    company: number | null;
    group: string | null;
    q: string;
    from: string;
    to: string;
};

type Props = {
    logs: Paginated<Log>;
    filters: Filters;
    groups: { key: string; label: string }[];
    companies: { id: number; name: string }[];
    failed_last_24h: number;
};

export default function AdminAudit({
    logs,
    filters,
    groups,
    companies,
    failed_last_24h,
}: Props) {
    const [form, setForm] = useState(filters);

    const apply = (next: Partial<Filters> = {}) => {
        const merged = { ...form, ...next };
        setForm(merged);
        router.get(
            auditIndex().url,
            Object.fromEntries(
                Object.entries(merged).filter(
                    ([, v]) => v !== null && v !== '',
                ),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Journal d’audit" />

            <Page
                title="Journal d’audit"
                description="Tout ce qui se passe sur la plateforme : connexions, modules, paiements, exports, actions de l’administration."
                className="max-w-6xl"
            >
                <div className="flex flex-col gap-5">
                    {failed_last_24h > 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                apply({ group: 'auth.login_failed' })
                            }
                            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800 hover:bg-red-100/70 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
                        >
                            <ShieldAlert className="size-5 shrink-0" />
                            <span>
                                <strong>
                                    {failed_last_24h} échec
                                    {failed_last_24h > 1 ? 's' : ''} de
                                    connexion
                                </strong>{' '}
                                ces dernières 24 heures. Afficher seulement les
                                échecs.
                            </span>
                        </button>
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply();
                        }}
                        className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_auto] dark:border-sidebar-border dark:bg-card"
                    >
                        <TextInput
                            icon={Search}
                            value={form.q}
                            onChange={(e) =>
                                setForm({ ...form, q: e.target.value })
                            }
                            placeholder="Nom ou e-mail"
                            aria-label="Personne"
                            className="h-10"
                        />
                        <SelectInput
                            value={form.company ?? ''}
                            onChange={(e) =>
                                apply({
                                    company: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                            aria-label="Entreprise"
                            className="h-10"
                        >
                            <option value="">Toutes les entreprises</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput
                            value={form.group ?? ''}
                            onChange={(e) =>
                                apply({ group: e.target.value || null })
                            }
                            aria-label="Type d’action"
                            className="h-10"
                        >
                            <option value="">Toutes les actions</option>
                            {groups.map((g) => (
                                <option key={g.key} value={g.key}>
                                    {g.label}
                                </option>
                            ))}
                        </SelectInput>
                        <TextInput
                            type="date"
                            value={form.from}
                            onChange={(e) => apply({ from: e.target.value })}
                            aria-label="Depuis le"
                            className="h-10"
                        />
                        <TextInput
                            type="date"
                            value={form.to}
                            onChange={(e) => apply({ to: e.target.value })}
                            aria-label="Jusqu’au"
                            className="h-10"
                        />
                        <ActionButton
                            type="submit"
                            variant="secondary"
                            className="h-10"
                        >
                            Filtrer
                        </ActionButton>
                    </form>

                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                        {logs.data.length === 0 ? (
                            <QuietEmpty icon={Search} title="Aucun événement">
                                Aucun événement ne correspond à ces filtres.
                            </QuietEmpty>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                {logs.data.map((log) => {
                                    const failed =
                                        log.action === 'auth.login_failed';

                                    return (
                                        <li
                                            key={log.id}
                                            className={cn(
                                                'grid gap-x-4 gap-y-1 px-5 py-3 text-sm lg:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]',
                                                failed &&
                                                    'bg-red-50/60 dark:bg-red-500/5',
                                            )}
                                        >
                                            <span className="text-xs text-slate-400 tabular-nums lg:pt-0.5">
                                                {log.at}
                                            </span>
                                            <div className="min-w-0">
                                                <p
                                                    className={cn(
                                                        'font-semibold',
                                                        failed
                                                            ? 'text-red-700 dark:text-red-300'
                                                            : 'text-ink',
                                                    )}
                                                >
                                                    {auditLabel(log.action)}
                                                </p>
                                                {log.details && (
                                                    <p
                                                        className="truncate text-xs text-slate-500"
                                                        title={log.details}
                                                    >
                                                        {log.details}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="min-w-0 text-xs text-slate-600">
                                                <p className="truncate">
                                                    {log.user ?? '—'}
                                                </p>
                                                {log.user_email && (
                                                    <p className="truncate text-slate-400">
                                                        {log.user_email}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="min-w-0 text-xs text-slate-600">
                                                {log.company_id ? (
                                                    <Link
                                                        href={
                                                            companyShow(
                                                                log.company_id,
                                                            ).url
                                                        }
                                                        className="block truncate hover:text-motriks-deep hover:underline"
                                                    >
                                                        {log.company ??
                                                            `Entreprise n° ${log.company_id}`}
                                                    </Link>
                                                ) : (
                                                    <p className="text-slate-400">
                                                        Plateforme
                                                    </p>
                                                )}
                                                {log.ip && (
                                                    <p className="truncate text-slate-400">
                                                        IP {log.ip}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <Pagination
                            page={logs}
                            className="border-t border-slate-100 dark:border-sidebar-border"
                        />
                    </section>
                </div>
            </Page>
        </>
    );
}

AdminAudit.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Journal d’audit', href: auditIndex().url },
    ],
};
