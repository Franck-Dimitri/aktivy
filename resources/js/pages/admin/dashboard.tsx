import { Head, Link } from '@inertiajs/react';
import {
    AlarmClock,
    Building2,
    CheckCircle2,
    ClipboardList,
    Clock,
    LifeBuoy,
    MailWarning,
    Moon,
    Plus,
    Store,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { buttonClass } from '@/components/page/buttons';
import { MetricRow } from '@/components/page/list-kit';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { dashboard } from '@/routes/admin';
import {
    create as companyCreate,
    index as companiesIndex,
    show as companyShow,
} from '@/routes/admin/companies';
import { index as onboardingIndex } from '@/routes/admin/onboarding';
import { index as supportIndex } from '@/routes/admin/support';
import { number } from '@/pages/reports/format';

type CompanyLink = { id: number; name: string };

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
};

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
    active: { label: 'Active', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    rejected: { label: 'Rejetée', tone: 'danger' },
    suspended: { label: 'Suspendue', tone: 'neutral' },
};


/** Liste compacte d'une carte « À traiter » : une ligne par entreprise, avec un lien vers sa fiche. */
function TodoList({
    empty,
    children,
}: {
    empty: string;
    children: ReactNode[];
}) {
    if (children.length === 0) {
        return <p className="px-5 py-6 text-sm text-slate-400">{empty}</p>;
    }

    return (
        <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
            {children}
        </ul>
    );
}

function TodoRow({
    id,
    title,
    detail,
    aside,
}: {
    id: number;
    title: string;
    detail: ReactNode;
    aside?: ReactNode;
}) {
    return (
        <li>
            <Link
                href={companyShow(id).url}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
            >
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                        {title}
                    </p>
                    <p className="truncate text-xs text-slate-500">{detail}</p>
                </div>
                {aside}
            </Link>
        </li>
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
}: Props) {
    return (
        <>
            <Head title="Administration" />

            <Page
                title="Administration de la plateforme"
                description="L’état de Motriks aujourd’hui, et ce qui demande votre attention."
                className="max-w-6xl"
                actions={
                    <>
                        {support_new > 0 && (
                            <Link
                                href={
                                    supportIndex({ query: { statut: 'new' } })
                                        .url
                                }
                                className={buttonClass('secondary', 'md')}
                            >
                                <LifeBuoy />
                                {support_new} demande
                                {support_new > 1 ? 's' : ''} de support
                            </Link>
                        )}
                        {companies.pending_with_file > 0 && (
                            <Link
                                href={onboardingIndex().url}
                                className={buttonClass('secondary', 'md')}
                            >
                                <ClipboardList />
                                {companies.pending_with_file} dossier
                                {companies.pending_with_file > 1 ? 's' : ''} à
                                valider
                            </Link>
                        )}
                        <Link
                            href={companyCreate().url}
                            className={buttonClass('primary', 'md')}
                        >
                            <Plus />
                            Créer une entreprise
                        </Link>
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    <MetricRow
                        items={[
                            {
                                label: 'Entreprises actives',
                                value: companies.active,
                                hint: `${companies.total} au total`,
                                icon: Building2,
                                tone: 'green',
                            },
                            {
                                label: 'En attente',
                                value: companies.pending,
                                hint: `${companies.pending_with_file} avec dossier déposé`,
                                icon: Clock,
                                tone: companies.pending ? 'amber' : 'default',
                                pulse: true,
                            },
                            {
                                label: 'Hôtesses actives',
                                value: usage.active_hostesses_month,
                                hint: `ce mois-ci, sur ${usage.hostesses}`,
                                icon: Users,
                                tone: 'blue',
                            },
                            {
                                label: 'Rapports du jour',
                                value: usage.reports_today,
                                hint: `${number.format(usage.reports_month)} ce mois-ci`,
                                icon: CheckCircle2,
                            },
                        ]}
                    />

                    <Panel
                        title={`Activité de ${month_label}`}
                        description="Entreprises actives uniquement."
                    >
                        <dl className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4 dark:bg-sidebar-border">
                            {[
                                {
                                    label: 'Chiffre d’affaires déclaré',
                                    value: `${number.format(Math.round(usage.revenue_month))} XAF`,
                                },
                                {
                                    label: 'Rapports soumis',
                                    value: number.format(usage.reports_month),
                                },
                                {
                                    label: 'Points de vente',
                                    value: number.format(usage.sites),
                                },
                                {
                                    label: 'Utilisateurs',
                                    value: number.format(usage.users),
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="bg-white px-5 py-4 dark:bg-card"
                                >
                                    <dt className="text-xs font-medium text-slate-500">
                                        {item.label}
                                    </dt>
                                    <dd className="mt-1 text-lg font-semibold text-ink tabular-nums">
                                        {item.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Panel>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Panel
                            title="Gérants sans e-mail confirmé"
                            description="Ils ne peuvent pas encore entrer dans leur espace."
                        >
                            <TodoList empty="Tous les gérants ont confirmé leur adresse.">
                                {unverified_managers.map((m) => (
                                    <TodoRow
                                        key={m.id}
                                        id={m.company_id}
                                        title={m.company ?? m.name}
                                        detail={`${m.name}${m.email ? ` · ${m.email}` : ''}`}
                                        aside={
                                            <MailWarning
                                                className="size-4 shrink-0 text-amber-500"
                                                aria-label={
                                                    m.invited
                                                        ? 'Invitation non ouverte'
                                                        : 'E-mail non confirmé'
                                                }
                                            />
                                        }
                                    />
                                ))}
                            </TodoList>
                        </Panel>

                        <Panel
                            title="Essais qui se terminent"
                            description="Dans les 7 prochains jours."
                        >
                            <TodoList empty="Aucun essai ne se termine cette semaine.">
                                {trials_ending.map((t) => (
                                    <TodoRow
                                        key={t.id}
                                        id={t.id}
                                        title={t.name}
                                        detail={`Essai ${t.plan} · fin le ${t.ends_on}`}
                                        aside={
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 tabular-nums">
                                                <AlarmClock className="size-3" />
                                                {t.days_left === 0
                                                    ? 'Aujourd’hui'
                                                    : `J-${t.days_left}`}
                                            </span>
                                        }
                                    />
                                ))}
                            </TodoList>
                        </Panel>

                        <Panel
                            title="Entreprises inactives"
                            description={`Aucun rapport depuis plus de ${inactive_days} jours.`}
                        >
                            <TodoList empty="Toutes les entreprises actives envoient des rapports.">
                                {inactive.map((c) => (
                                    <TodoRow
                                        key={c.id}
                                        id={c.id}
                                        title={c.name}
                                        detail={
                                            c.last_report
                                                ? `Dernier rapport le ${c.last_report}`
                                                : `Aucun rapport · ${c.hostesses_count} hôtesse${c.hostesses_count > 1 ? 's' : ''}`
                                        }
                                        aside={
                                            <Moon
                                                className="size-4 shrink-0 text-slate-400"
                                                aria-hidden
                                            />
                                        }
                                    />
                                ))}
                            </TodoList>
                        </Panel>
                    </div>

                    <Panel
                        title="Dernières inscriptions"
                        actions={
                            <Link
                                href={companiesIndex().url}
                                className={buttonClass('ghost', 'sm')}
                            >
                                <Store />
                                Toutes les entreprises
                            </Link>
                        }
                    >
                        <TodoList empty="Aucune entreprise pour l’instant.">
                            {recent_companies.map((c) => (
                                <TodoRow
                                    key={c.id}
                                    id={c.id}
                                    title={c.name}
                                    detail={
                                        c.created_at
                                            ? `Inscrite le ${c.created_at}`
                                            : '—'
                                    }
                                    aside={
                                        <StatusBadge
                                            tone={
                                                STATUS[c.status]?.tone ??
                                                'neutral'
                                            }
                                        >
                                            {STATUS[c.status]?.label ??
                                                c.status}
                                        </StatusBadge>
                                    }
                                />
                            ))}
                        </TodoList>
                    </Panel>
                </div>
            </Page>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
