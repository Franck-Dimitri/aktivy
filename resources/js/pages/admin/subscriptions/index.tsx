import { Head, Link, router } from '@inertiajs/react';
import {
    AlarmClock,
    Banknote,
    BellRing,
    CalendarClock,
    CircleSlash,
    Search,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    fcfa,
    PaymentsPanel,
    type PaymentRow,
} from '@/components/admin/payments-panel';
import {
    RecordPaymentModal,
    type Option,
    type PlanOption,
} from '@/components/admin/record-payment-modal';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes/admin';
import { show as companyShow } from '@/routes/admin/companies';
import {
    index as subscriptionsIndex,
    remind,
} from '@/routes/admin/subscriptions';

type Row = {
    id: number;
    name: string;
    status: string;
    state: 'trial' | 'paying' | 'expired' | 'starter';
    plan_key: string;
    plan: string;
    subscribed_plan: string;
    subscribed_key: string;
    ends_on: string | null;
    days_left: number | null;
    soon: boolean;
    extra_packs: number;
    monthly_price: number;
    can_remind: boolean;
    last_paid: string | null;
};

type Props = {
    rows: Row[];
    stats: {
        paid_month: number;
        paid_year: number;
        trial: number;
        paying: number;
        soon: number;
        expired: number;
        starter: number;
        mrr: number;
    };
    payments: PaymentRow[];
    plans: PlanOption[];
    methods: Option[];
    pack_price: number;
    soon_days: number;
};

const STATE: Record<Row['state'], { label: string; tone: StatusTone }> = {
    trial: { label: 'En essai', tone: 'info' },
    paying: { label: 'Payant', tone: 'success' },
    expired: { label: 'Expiré', tone: 'danger' },
    starter: { label: 'Gratuit', tone: 'neutral' },
};

type Filter = 'all' | 'soon' | Row['state'];

export default function AdminSubscriptions({
    rows,
    stats,
    payments,
    plans,
    methods,
    pack_price,
    soon_days,
}: Props) {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [paying, setPaying] = useState<Row | null>(null);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();

        return rows.filter(
            (r) =>
                (filter === 'all'
                    ? true
                    : filter === 'soon'
                      ? r.soon
                      : r.state === filter) &&
                (!q || r.name.toLowerCase().includes(q)),
        );
    }, [rows, filter, query]);

    const sendReminder = (r: Row) =>
        router.post(
            remind(r.id).url,
            {},
            { preserveScroll: true, onError: toastFormError },
        );

    return (
        <>
            <Head title="Abonnements" />

            <Page
                title="Abonnements"
                description="Forfait de chaque entreprise, échéances, paiements reçus et factures. Le paiement en ligne viendra plus tard : enregistrez ici ce que vous recevez."
                className="max-w-6xl"
            >
                <div className="flex flex-col gap-6">
                    <MetricRow
                        items={[
                            {
                                label: 'Encaissé ce mois-ci',
                                value: fcfa(stats.paid_month),
                                hint: `${fcfa(stats.paid_year)} cette année`,
                                icon: Wallet,
                                tone: 'green',
                            },
                            {
                                label: 'Revenu mensuel attendu',
                                value: fcfa(stats.mrr),
                                hint: `${stats.paying} forfait${stats.paying > 1 ? 's' : ''} payant${stats.paying > 1 ? 's' : ''} · ${stats.trial} en essai`,
                                icon: Banknote,
                            },
                            {
                                label: 'Échéances proches',
                                value: stats.soon,
                                hint: `dans les ${soon_days} jours`,
                                icon: AlarmClock,
                                tone: stats.soon ? 'amber' : 'default',
                                pulse: true,
                            },
                            {
                                label: 'En Starter',
                                value: stats.starter + stats.expired,
                                hint: `dont ${stats.expired} forfait${stats.expired > 1 ? 's' : ''} expiré${stats.expired > 1 ? 's' : ''}`,
                                icon: CircleSlash,
                                tone: stats.expired ? 'red' : 'default',
                            },
                        ]}
                    />

                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-sidebar-border">
                            <Segmented
                                label="Filtrer les abonnements"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    {
                                        value: 'all',
                                        label: 'Toutes',
                                        count: rows.length,
                                    },
                                    {
                                        value: 'soon',
                                        label: 'Échéance proche',
                                        count: stats.soon,
                                    },
                                    {
                                        value: 'trial',
                                        label: 'En essai',
                                        count: stats.trial,
                                    },
                                    {
                                        value: 'paying',
                                        label: 'Payantes',
                                        count: stats.paying,
                                    },
                                    {
                                        value: 'expired',
                                        label: 'Expirés',
                                        count: stats.expired,
                                    },
                                    {
                                        value: 'starter',
                                        label: 'Starter',
                                        count: stats.starter,
                                    },
                                ]}
                            />
                            <div className="lg:w-72">
                                <TextInput
                                    icon={Search}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Nom de l’entreprise"
                                    aria-label="Rechercher une entreprise"
                                    className="h-9"
                                />
                            </div>
                        </div>

                        {shown.length === 0 ? (
                            <QuietEmpty
                                icon={Search}
                                title="Aucune entreprise ne correspond"
                            >
                                Modifiez la recherche ou le filtre.
                            </QuietEmpty>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                {shown.map((r) => (
                                    <li
                                        key={r.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={companyShow(r.id).url}
                                                    className="truncate text-sm font-semibold text-ink hover:text-motriks-deep hover:underline"
                                                >
                                                    {r.name}
                                                </Link>
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                                    {r.plan}
                                                </span>
                                                <StatusBadge
                                                    tone={STATE[r.state].tone}
                                                >
                                                    {STATE[r.state].label}
                                                </StatusBadge>
                                                {r.soon && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 tabular-nums">
                                                        <AlarmClock className="size-3" />
                                                        {r.days_left === 0
                                                            ? 'Aujourd’hui'
                                                            : `J-${r.days_left}`}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                                                {r.state === 'expired' ? (
                                                    <span>
                                                        {r.subscribed_plan}{' '}
                                                        terminé le {r.ends_on}
                                                    </span>
                                                ) : (
                                                    r.state !== 'starter' && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <CalendarClock className="size-3" />
                                                            {r.ends_on
                                                                ? `Jusqu’au ${r.ends_on}`
                                                                : 'Sans date de fin'}
                                                        </span>
                                                    )
                                                )}
                                                {r.extra_packs > 0 && (
                                                    <span>
                                                        +{r.extra_packs} pack
                                                        {r.extra_packs > 1
                                                            ? 's'
                                                            : ''}
                                                    </span>
                                                )}
                                                <span>
                                                    {r.last_paid
                                                        ? `Dernier paiement le ${r.last_paid}`
                                                        : 'Aucun paiement'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {r.can_remind && (
                                                <ActionButton
                                                    size="sm"
                                                    variant="ghost"
                                                    icon={<BellRing />}
                                                    onClick={() =>
                                                        sendReminder(r)
                                                    }
                                                >
                                                    Relancer
                                                </ActionButton>
                                            )}
                                            <ActionButton
                                                size="sm"
                                                variant="secondary"
                                                icon={<Banknote />}
                                                onClick={() => setPaying(r)}
                                            >
                                                Paiement reçu
                                            </ActionButton>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <PaymentsPanel payments={payments} showCompany />
                </div>
            </Page>

            {paying && (
                <RecordPaymentModal
                    company={{ id: paying.id, name: paying.name }}
                    plans={plans}
                    methods={methods}
                    packPrice={pack_price}
                    currentPlan={paying.subscribed_key}
                    currentPacks={paying.extra_packs}
                    onClose={() => setPaying(null)}
                />
            )}
        </>
    );
}

AdminSubscriptions.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Abonnements', href: subscriptionsIndex().url },
    ],
};
