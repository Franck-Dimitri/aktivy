import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    CreditCard,
    FileDown,
    KeyRound,
    LifeBuoy,
    LogIn,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserCog,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { AuditTabs } from '@/components/admin/audit-tabs';
import { SelectInput, TextInput } from '@/components/page/form-fields';
import { QuietEmpty } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { auditFamily, auditLabel, type AuditFamily } from '@/lib/audit-actions';
import { initials } from '@/lib/initials';
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
    time: string | null;
    day: string | null;
    day_label: string | null;
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
    last_24h: { total: number; logins: number; failed: number; admin: number };
};

/** Icône et couleur de chaque famille d'action. */
const FAMILY: Record<AuditFamily, { icon: LucideIcon; tone: string }> = {
    login: { icon: LogIn, tone: 'bg-green-50 text-green-700 ring-green-600/15' },
    failed: { icon: ShieldAlert, tone: 'bg-red-50 text-red-600 ring-red-600/15' },
    company: { icon: Building2, tone: 'bg-violet-50 text-violet-700 ring-violet-600/15' },
    billing: { icon: CreditCard, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
    admin: { icon: UserCog, tone: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    support: { icon: LifeBuoy, tone: 'bg-teal-50 text-teal-700 ring-teal-600/15' },
    data: { icon: FileDown, tone: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
    account: { icon: KeyRound, tone: 'bg-slate-100 text-slate-600 ring-slate-500/15' },
    field: { icon: Users, tone: 'bg-slate-100 text-slate-600 ring-slate-500/15' },
};

const EMPTY: Filters = { company: null, group: null, q: '', from: '', to: '' };

/** Journal d'audit : chaque action de la plateforme, jour par jour, avec qui, où et depuis quelle adresse. */
export default function AdminAudit({ logs, filters, groups, companies, last_24h }: Props) {
    const [form, setForm] = useState(filters);
    const active = Boolean(filters.company || filters.group || filters.q || filters.from || filters.to);

    const apply = (next: Partial<Filters> = {}) => {
        const merged = { ...form, ...next };
        setForm(merged);
        router.get(auditIndex().url, Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== null && v !== '')), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Recherche par personne, 350 ms après la dernière frappe
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }

        const timer = setTimeout(() => form.q !== filters.q && apply({ q: form.q }), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.q]);

    const showFailed = () => apply({ ...EMPTY, group: 'auth.login_failed' });

    return (
        <>
            <Head title="Journal d’audit" />

            <Page title="Journal d’audit" description="Connexions, forfaits, paiements, exports et actions de l’administration, au fil de l’eau.">
                <div className="flex flex-col gap-5">
                    <div>
                        <AuditTabs current="activity" />
                    </div>

                    {/* Dernières 24 heures */}
                    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] sm:grid-cols-4 dark:border-sidebar-border dark:bg-card">
                        <Stat label="Événements" hint="sur 24 h" value={last_24h.total} />
                        <Stat label="Connexions" hint="sur 24 h" value={last_24h.logins} icon={ShieldCheck} />
                        <Stat
                            label="Échecs de connexion"
                            hint={last_24h.failed > 0 ? 'Voir les échecs' : 'aucun sur 24 h'}
                            value={last_24h.failed}
                            icon={ShieldAlert}
                            alert={last_24h.failed > 0}
                            onClick={last_24h.failed > 0 ? showFailed : undefined}
                        />
                        <Stat label="Actions de l’administration" hint="sur 24 h" value={last_24h.admin} icon={UserCog} />
                    </dl>

                    {/* Filtres */}
                    <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/[0.03] lg:flex-row lg:items-center dark:border-sidebar-border dark:bg-card">
                        <div className="lg:w-64">
                            <TextInput
                                icon={Search}
                                value={form.q}
                                onChange={(e) => setForm({ ...form, q: e.target.value })}
                                placeholder="Personne (nom ou e-mail)"
                                aria-label="Personne"
                                className="h-9"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 lg:flex lg:flex-1 lg:items-center">
                            <div className="col-span-2 sm:col-span-1">
                                <SelectInput
                                    value={form.company ?? ''}
                                    onChange={(e) => apply({ company: e.target.value ? Number(e.target.value) : null })}
                                    aria-label="Entreprise"
                                    className="h-9 lg:w-52"
                                >
                                    <option value="">Toutes les entreprises</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <SelectInput
                                    value={form.group ?? ''}
                                    onChange={(e) => apply({ group: e.target.value || null })}
                                    aria-label="Type d’action"
                                    className="h-9 lg:w-52"
                                >
                                    <option value="">Toutes les actions</option>
                                    {groups.map((g) => (
                                        <option key={g.key} value={g.key}>
                                            {g.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            <label className="flex min-w-0 items-center gap-2 text-xs text-slate-500 [&>div]:min-w-0 [&>div]:flex-1">
                                <span className="shrink-0">Du</span>
                                <TextInput
                                    type="date"
                                    value={form.from}
                                    max={form.to || undefined}
                                    onChange={(e) => apply({ from: e.target.value })}
                                    aria-label="Depuis le"
                                    className="h-9 w-full min-w-0"
                                />
                            </label>
                            <label className="flex min-w-0 items-center gap-2 text-xs text-slate-500 [&>div]:min-w-0 [&>div]:flex-1">
                                <span className="shrink-0">au</span>
                                <TextInput
                                    type="date"
                                    value={form.to}
                                    min={form.from || undefined}
                                    onChange={(e) => apply({ to: e.target.value })}
                                    aria-label="Jusqu’au"
                                    className="h-9 w-full min-w-0"
                                />
                            </label>
                        </div>
                        {active && (
                            <button
                                type="button"
                                onClick={() => apply(EMPTY)}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
                            >
                                <X className="size-3.5" />
                                Effacer
                            </button>
                        )}
                    </div>

                    {/* Événements, jour par jour */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                        {logs.data.length === 0 ? (
                            <QuietEmpty icon={Search} title="Aucun événement">
                                Aucun événement ne correspond à ces filtres.
                            </QuietEmpty>
                        ) : (
                            <ol>
                                {logs.data.map((log, i) => {
                                    const newDay = i === 0 || logs.data[i - 1].day !== log.day;

                                    return (
                                        <Fragment key={log.id}>
                                            {newDay && (
                                                <li className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 px-5 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase backdrop-blur first:border-t-0 dark:border-sidebar-border dark:bg-white/[0.03]">
                                                    {log.day_label}
                                                </li>
                                            )}
                                            <LogRow log={log} />
                                        </Fragment>
                                    );
                                })}
                            </ol>
                        )}
                        <Pagination page={logs} className="border-t border-slate-100 dark:border-sidebar-border" />
                    </section>
                </div>
            </Page>
        </>
    );
}

function Stat({
    label,
    hint,
    value,
    icon: Icon,
    alert = false,
    onClick,
}: {
    label: string;
    hint: string;
    value: number;
    icon?: LucideIcon;
    alert?: boolean;
    onClick?: () => void;
}) {
    const body = (
        <>
            <dt className={cn('flex items-center gap-1.5 text-xs font-medium', alert ? 'text-red-600' : 'text-slate-500')}>
                {Icon && <Icon className="size-3.5" />}
                {label}
            </dt>
            <dd className={cn('mt-1.5 text-2xl font-bold tracking-tight tabular-nums', alert ? 'text-red-600' : 'text-ink')}>{value}</dd>
            <dd className={cn('mt-0.5 text-xs', alert ? 'font-medium text-red-600 underline-offset-2 group-hover:underline' : 'text-slate-400')}>
                {hint}
            </dd>
        </>
    );

    const cell =
        'border-slate-100 px-5 py-4 text-left [&:nth-child(odd)]:border-r sm:border-r sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0 dark:border-sidebar-border';

    return onClick ? (
        <button type="button" onClick={onClick} className={cn(cell, 'group bg-red-50/40 transition-colors hover:bg-red-50')}>
            {body}
        </button>
    ) : (
        <div className={cell}>{body}</div>
    );
}

function LogRow({ log }: { log: Log }) {
    const family = auditFamily(log.action);
    const { icon: Icon, tone } = FAMILY[family];
    const failed = family === 'failed';

    return (
        <li
            className={cn(
                'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_15rem_13rem_3.5rem] lg:items-center dark:border-sidebar-border',
                failed && 'bg-red-50/40 dark:bg-red-500/5',
            )}
        >
            <span className={cn('flex size-9 items-center justify-center rounded-xl ring-1 ring-inset', tone)}>
                <Icon className="size-4" />
            </span>

            <div className="min-w-0">
                <p className={cn('truncate text-sm font-semibold', failed ? 'text-red-700 dark:text-red-300' : 'text-ink')}>
                    {auditLabel(log.action)}
                </p>
                {log.details && (
                    <p className="truncate text-xs text-slate-500" title={log.details}>
                        {log.details}
                    </p>
                )}
                <p className="mt-0.5 truncate text-xs text-slate-400 lg:hidden">{[log.user ?? 'Système', log.company].filter(Boolean).join(' · ')}</p>
            </div>

            <time title={log.at ?? undefined} className="text-xs text-slate-400 tabular-nums lg:order-last lg:text-right">
                {log.time}
            </time>

            {/* Acteur */}
            <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
                {log.user ? (
                    <>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                            {initials(log.user)}
                        </span>
                        <span className="min-w-0 text-xs">
                            <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{log.user}</span>
                            {log.user_email && <span className="block truncate text-slate-400">{log.user_email}</span>}
                        </span>
                    </>
                ) : (
                    <span className="text-xs text-slate-400">Système</span>
                )}
            </div>

            {/* Entreprise et adresse IP */}
            <div className="hidden min-w-0 text-xs lg:block">
                {log.company_id ? (
                    <Link
                        href={companyShow(log.company_id).url}
                        className="flex min-w-0 items-center gap-1.5 font-medium text-slate-700 hover:text-motriks-deep dark:text-slate-200"
                    >
                        <Building2 className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{log.company ?? `Entreprise n° ${log.company_id}`}</span>
                    </Link>
                ) : (
                    <span className="text-slate-400">Plateforme</span>
                )}
                {log.ip && <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-400">{log.ip}</span>}
            </div>
        </li>
    );
}

AdminAudit.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Journal d’audit', href: auditIndex().url },
    ],
};
