import { Head, Link } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowRight,
    Building2,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    LifeBuoy,
    MailWarning,
    Moon,
    Plus,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CreateCompanyModal } from '@/components/admin/create-company-modal';
import { buttonClass } from '@/components/page/buttons';
import { CompanyAvatar } from '@/components/page/list-kit';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as companiesIndex, show as companyShow } from '@/routes/admin/companies';
import { index as onboardingIndex } from '@/routes/admin/onboarding';
import { index as subscriptionsIndex } from '@/routes/admin/subscriptions';
import { index as supportIndex } from '@/routes/admin/support';
import { number } from '@/pages/reports/format';

type CompanyLink = { id: number; name: string };

type DayPoint = { date: string; reports: number; revenue: number };

type Props = {
    companies: {
        total: number;
        active: number;
        pending: number;
        pending_with_file: number;
        suspended: number;
    };
    usage: {
        users: number;
        hostesses: number;
        active_hostesses_month: number;
        reports_today: number;
        reports_month: number;
        revenue_month: number;
        sites: number;
    };
    inactive: (CompanyLink & {
        last_report: string | null;
        hostesses_count: number;
        created_at: string | null;
    })[];
    inactive_days: number;
    trials_ending: (CompanyLink & { plan: string; ends_on: string; days_left: number })[];
    unverified_managers: {
        id: number;
        name: string;
        email: string | null;
        company_id: number;
        company: string | null;
        invited: boolean;
        created_at: string | null;
    }[];
    recent_companies: (CompanyLink & {
        status: string;
        created_at: string | null;
    })[];
    month_label: string;
    support_new: number;
    series: DayPoint[];
    signups_month: number;
    paid_month: number;
    plans: { key: string; label: string; count: number }[];
    sectors: string[];
};

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
    active: { label: 'Active', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    rejected: { label: 'Rejetée', tone: 'danger' },
    suspended: { label: 'Suspendue', tone: 'neutral' },
};

/** Vert Motriks : contraste et lisibilité validés sur fond blanc (une seule série). */
const BAR = '#039855';

const fcfa = (n: number) => `${number.format(Math.round(n))} FCFA`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
const shortDay = (iso: string) => toDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const longDay = (iso: string) => toDate(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ── Activité des 30 derniers jours ─────────────────────────────────────────

function DayTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayPoint }[] }) {
    if (!active || !payload?.length) return null;

    const p = payload[0].payload;

    return (
        <div className="min-w-44 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg shadow-slate-900/10">
            <p className="font-medium text-slate-500 first-letter:uppercase">{longDay(p.date)}</p>
            <div className="mt-1.5 flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-500">
                    <span className="size-2 rounded-[2px]" style={{ backgroundColor: BAR }} />
                    Rapports
                </span>
                <span className="font-semibold text-ink tabular-nums">{number.format(p.reports)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4">
                <span className="pl-4 text-slate-500">CA déclaré</span>
                <span className="text-slate-700 tabular-nums">{fcfa(p.revenue)}</span>
            </div>
        </div>
    );
}

function ActivityCard({ series, usage }: { series: DayPoint[]; usage: Props['usage'] }) {
    const total = series.reduce((s, p) => s + p.reports, 0);
    const revenue = series.reduce((s, p) => s + p.revenue, 0);
    const empty = total === 0;

    return (
        <Panel className="lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-5">
                <div>
                    <h2 className="text-[15px] font-semibold text-ink">Activité terrain</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Rapports soumis par jour, sur les 30 derniers jours.</p>
                </div>
                <dl className="flex gap-6">
                    <div>
                        <dt className="text-xs text-slate-500">Rapports</dt>
                        <dd className="text-xl font-semibold tracking-tight text-ink tabular-nums">{number.format(total)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-slate-500">CA déclaré</dt>
                        <dd className="text-xl font-semibold tracking-tight text-ink tabular-nums">{fcfa(revenue)}</dd>
                    </div>
                </dl>
            </div>

            <div className="relative h-56 w-full px-2 pt-4 pb-1 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap="22%">
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={shortDay}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                            interval="preserveStartEnd"
                            minTickGap={28}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={32} />
                        {!empty && <Tooltip content={<DayTooltip />} cursor={{ fill: '#f1f5f9' }} />}
                        <Bar dataKey="reports" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
                {empty && (
                    <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                        Aucun rapport soumis sur les 30 derniers jours.
                    </p>
                )}
            </div>

            {/* Le mois en cours, entreprises actives */}
            <dl className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4 dark:border-sidebar-border dark:bg-sidebar-border">
                {[
                    { label: 'CA déclaré ce mois-ci', value: fcfa(usage.revenue_month) },
                    { label: 'Rapports ce mois-ci', value: number.format(usage.reports_month) },
                    { label: 'Points de vente', value: number.format(usage.sites) },
                    { label: 'Utilisateurs', value: number.format(usage.users) },
                ].map((item) => (
                    <div key={item.label} className="bg-white px-5 py-3.5 dark:bg-card">
                        <dt className="truncate text-xs text-slate-500 first-letter:uppercase">{item.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-ink tabular-nums">{item.value}</dd>
                    </div>
                ))}
            </dl>
        </Panel>
    );
}

// ── À traiter ───────────────────────────────────────────────────────────────

type Todo = { label: string; detail: string; count: number; icon: LucideIcon; href: string; external?: boolean };

function TodoCard({ items }: { items: Todo[] }) {
    const pending = items.reduce((s, i) => s + i.count, 0);

    return (
        <Panel>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-sidebar-border">
                <h2 className="text-[15px] font-semibold text-ink">À traiter</h2>
                {pending > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/15 tabular-nums">
                        {pending}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-motriks-deep">
                        <CheckCircle2 className="size-3.5" />
                        Tout est à jour
                    </span>
                )}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                {items.map((item) => {
                    const done = item.count === 0;
                    const content = (
                        <>
                            <span
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                    done ? 'bg-slate-50 text-slate-400' : 'bg-amber-50 text-amber-600',
                                )}
                            >
                                <item.icon className="size-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className={cn('block truncate text-sm font-medium', done ? 'text-slate-500' : 'text-ink')}>{item.label}</span>
                                <span className="block truncate text-xs text-slate-400">{item.detail}</span>
                            </span>
                            <span
                                className={cn(
                                    'min-w-7 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums',
                                    done ? 'text-slate-400' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
                                )}
                            >
                                {item.count}
                            </span>
                            <ChevronRight
                                className={cn(
                                    'size-4 shrink-0 text-slate-300 transition-transform',
                                    !done && 'group-hover:translate-x-0.5 group-hover:text-slate-500',
                                )}
                            />
                        </>
                    );
                    const className = 'group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02]';

                    return (
                        <li key={item.label}>
                            {item.external ? (
                                <a href={item.href} className={className}>
                                    {content}
                                </a>
                            ) : (
                                <Link href={item.href} className={className}>
                                    {content}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}

// ── Forfaits ────────────────────────────────────────────────────────────────

function PlansCard({ plans, active }: { plans: Props['plans']; active: number }) {
    const max = Math.max(1, ...plans.map((p) => p.count));

    return (
        <Panel title="Forfaits" description={`Les ${plural(active, 'entreprise active', 'entreprises actives')}, essais compris.`}>
            <ul className="flex flex-col gap-3.5 px-5 pt-5 pb-4">
                {plans.map((p) => (
                    <li key={p.key} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate text-slate-600">{p.label}</span>
                            <span className="font-semibold text-ink tabular-nums">{p.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                                className="h-full rounded-full transition-[width] duration-500"
                                style={{ width: `${(p.count / max) * 100}%`, backgroundColor: BAR, opacity: p.count === 0 ? 0 : 1 }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
            <Link
                href={subscriptionsIndex().url}
                className="group flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm font-medium text-motriks-deep hover:bg-slate-50/70 dark:border-sidebar-border"
            >
                Voir les abonnements
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
        </Panel>
    );
}

// ── Chiffres clés ───────────────────────────────────────────────────────────

type Kpi = { label: string; value: string | number; hint: string; icon: LucideIcon; tone: string };

/** Bandeau des chiffres clés : une carte, séparateurs fins ; l'icône s'efface sur téléphone pour laisser la place au chiffre. */
function KpiGrid({ items }: { items: Kpi[] }) {
    return (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm shadow-slate-900/[0.03] lg:grid-cols-4 dark:border-sidebar-border dark:bg-sidebar-border">
            {items.map(({ label, value, hint, icon: Icon, tone }) => (
                <div key={label} className="flex min-w-0 items-start gap-3.5 bg-white px-4 py-4 sm:px-5 dark:bg-card">
                    <span className={cn('hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex', tone)}>
                        <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <dt className="text-xs leading-snug font-medium text-slate-500">{label}</dt>
                        <dd className="mt-1 text-xl font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums sm:text-2xl">{value}</dd>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</p>
                    </div>
                </div>
            ))}
        </dl>
    );
}

// ── Listes détaillées ───────────────────────────────────────────────────────

function DetailRow({ id, title, detail, aside }: { id: number; title: string; detail: ReactNode; aside?: ReactNode }) {
    return (
        <li>
            <Link
                href={companyShow(id).url}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
            >
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{title}</p>
                    <p className="truncate text-xs text-slate-500">{detail}</p>
                </div>
                {aside}
            </Link>
        </li>
    );
}

/** Au-delà, la liste renvoie vers la page Entreprises. */
const DETAIL_LIMIT = 6;

function DetailPanel({
    id,
    title,
    description,
    more,
    children,
}: {
    id: string;
    title: string;
    description: string;
    more: number;
    children: ReactNode;
}) {
    return (
        <div id={id} className="scroll-mt-24">
            <Panel title={title} description={description} className="h-full">
                <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">{children}</ul>
                {more > 0 && (
                    <Link
                        href={companiesIndex().url}
                        className="block border-t border-slate-100 px-5 py-3 text-xs font-medium text-motriks-deep hover:underline dark:border-sidebar-border"
                    >
                        Et {plural(more, 'autre')}
                    </Link>
                )}
            </Panel>
        </div>
    );
}

export default function AdminDashboard({
    companies,
    usage,
    inactive,
    inactive_days,
    trials_ending,
    unverified_managers,
    recent_companies,
    month_label,
    support_new,
    series,
    signups_month,
    paid_month,
    plans,
    sectors,
}: Props) {
    const [creating, setCreating] = useState(false);

    const todos: Todo[] = [
        {
            label: 'Dossiers à valider',
            detail: 'Inscriptions complètes, en attente',
            count: companies.pending_with_file,
            icon: ClipboardList,
            href: onboardingIndex().url,
        },
        {
            label: 'Demandes de support',
            detail: 'Messages pas encore traités',
            count: support_new,
            icon: LifeBuoy,
            href: supportIndex({ query: { statut: 'new' } }).url,
        },
        {
            label: 'E-mails non confirmés',
            detail: 'Gérants sans accès pour l’instant',
            count: unverified_managers.length,
            icon: MailWarning,
            href: '#gerants',
            external: true,
        },
        {
            label: 'Essais qui se terminent',
            detail: 'Dans les 7 prochains jours',
            count: trials_ending.length,
            icon: AlarmClock,
            href: '#essais',
            external: true,
        },
        {
            label: 'Entreprises inactives',
            detail: `Aucun rapport depuis ${inactive_days} jours`,
            count: inactive.length,
            icon: Moon,
            href: '#inactives',
            external: true,
        },
    ];

    const details = [
        unverified_managers.length > 0 && (
            <DetailPanel
                key="gerants"
                id="gerants"
                title="Gérants sans e-mail confirmé"
                description="Ils ne peuvent pas encore entrer dans leur espace."
                more={unverified_managers.length - DETAIL_LIMIT}
            >
                {unverified_managers.slice(0, DETAIL_LIMIT).map((m) => (
                    <DetailRow
                        key={m.id}
                        id={m.company_id}
                        title={m.company ?? m.name}
                        detail={`${m.name}${m.email ? ` · ${m.email}` : ''}`}
                        aside={
                            <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {m.invited ? 'Invitation non ouverte' : 'Non confirmé'}
                            </span>
                        }
                    />
                ))}
            </DetailPanel>
        ),
        trials_ending.length > 0 && (
            <DetailPanel
                key="essais"
                id="essais"
                title="Essais qui se terminent"
                description="Dans les 7 prochains jours."
                more={trials_ending.length - DETAIL_LIMIT}
            >
                {trials_ending.slice(0, DETAIL_LIMIT).map((t) => (
                    <DetailRow
                        key={t.id}
                        id={t.id}
                        title={t.name}
                        detail={`Essai ${t.plan} · fin le ${t.ends_on}`}
                        aside={
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 tabular-nums">
                                <AlarmClock className="size-3" />
                                {t.days_left === 0 ? 'Aujourd’hui' : `J-${t.days_left}`}
                            </span>
                        }
                    />
                ))}
            </DetailPanel>
        ),
        inactive.length > 0 && (
            <DetailPanel
                key="inactives"
                id="inactives"
                title="Entreprises inactives"
                description={`Aucun rapport depuis plus de ${inactive_days} jours.`}
                more={inactive.length - DETAIL_LIMIT}
            >
                {inactive.slice(0, DETAIL_LIMIT).map((c) => (
                    <DetailRow
                        key={c.id}
                        id={c.id}
                        title={c.name}
                        detail={c.last_report ? `Dernier rapport le ${c.last_report}` : `Aucun rapport · ${plural(c.hostesses_count, 'hôtesse')}`}
                        aside={<Moon className="size-4 shrink-0 text-slate-300" aria-hidden />}
                    />
                ))}
            </DetailPanel>
        ),
    ].filter(Boolean);

    return (
        <>
            <Head title="Administration" />

            <Page
                title="Tableau de bord"
                description="L’état de Motriks aujourd’hui, et ce qui demande votre attention."
                actions={
                    <button type="button" onClick={() => setCreating(true)} className={buttonClass('primary', 'md')}>
                        <Plus />
                        Créer une entreprise
                    </button>
                }
            >
                <div className="flex flex-col gap-6">
                    <KpiGrid
                        items={[
                            {
                                label: 'Entreprises actives',
                                value: companies.active,
                                hint:
                                    signups_month > 0
                                        ? `+${signups_month} inscrite${signups_month > 1 ? 's' : ''} en ${month_label}`
                                        : `${companies.total} au total`,
                                icon: Building2,
                                tone: 'bg-motriks-soft text-motriks-deep',
                            },
                            {
                                label: 'Hôtesses actives',
                                value: usage.active_hostesses_month,
                                hint: `ce mois-ci, sur ${usage.hostesses}`,
                                icon: Users,
                                tone: 'bg-blue-50 text-blue-600',
                            },
                            {
                                label: 'Rapports du jour',
                                value: usage.reports_today,
                                hint: `${number.format(usage.reports_month)} ce mois-ci`,
                                icon: ClipboardCheck,
                                tone: 'bg-slate-100 text-slate-500',
                            },
                            {
                                label: 'Encaissé ce mois-ci',
                                value: fcfa(paid_month),
                                hint: 'Paiements d’abonnements',
                                icon: Wallet,
                                tone: 'bg-slate-100 text-slate-500',
                            },
                        ]}
                    />

                    <div className="grid gap-6 lg:grid-cols-3">
                        <ActivityCard series={series} usage={usage} />
                        <TodoCard items={todos} />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Panel
                            title="Dernières inscriptions"
                            className="lg:col-span-2"
                            actions={
                                <Link href={companiesIndex().url} className={buttonClass('ghost', 'sm')}>
                                    <span className="hidden sm:inline">Toutes les entreprises</span>
                                    <span className="sm:hidden">Tout voir</span>
                                    <ArrowRight />
                                </Link>
                            }
                        >
                            {recent_companies.length === 0 ? (
                                <p className="px-5 py-6 text-sm text-slate-400">Aucune entreprise pour l’instant.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                    {recent_companies.map((c) => (
                                        <li key={c.id}>
                                            <Link
                                                href={companyShow(c.id).url}
                                                className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                                            >
                                                <CompanyAvatar name={c.name} className="size-9" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {c.created_at ? `Inscrite le ${c.created_at}` : '—'}
                                                    </p>
                                                </div>
                                                <StatusBadge tone={STATUS[c.status]?.tone ?? 'neutral'}>
                                                    {STATUS[c.status]?.label ?? c.status}
                                                </StatusBadge>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <PlansCard plans={plans} active={companies.active} />
                    </div>

                    {details.length > 0 && (
                        <div className={cn('grid gap-6', details.length === 2 ? 'lg:grid-cols-2' : details.length === 3 ? 'lg:grid-cols-3' : '')}>
                            {details}
                        </div>
                    )}
                </div>
            </Page>

            {creating && <CreateCompanyModal sectors={sectors} onClose={() => setCreating(false)} />}
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
