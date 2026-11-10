import { Head, Link, router } from '@inertiajs/react';
import { Banknote, BellRing, Blocks, Building2, Check, MoreHorizontal, Receipt, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RecordPaymentModal, type Option, type PlanOption } from '@/components/admin/record-payment-modal';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { packSummary, type PackCatalog } from '@/components/plans/plan-usage';
import { CompanyAvatar, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { number } from '@/pages/reports/format';
import { dashboard } from '@/routes/admin';
import { plan as companyPlan, show as companyShow } from '@/routes/admin/companies';
import { index as invoicesIndex } from '@/routes/admin/invoices';
import { index as subscriptionsIndex, remind } from '@/routes/admin/subscriptions';

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
    supervisor_packs: number;
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
    plans: PlanOption[];
    methods: Option[];
    packs: PackCatalog;
    soon_days: number;
};

/** Teinte de chaque forfait, du plus simple au plus complet. */
const PLAN_TONE: Record<string, { tile: string; bar: string; ring: string }> = {
    starter: { tile: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400', ring: 'ring-slate-400' },
    pro: { tile: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-400', ring: 'ring-emerald-500' },
    business: { tile: 'bg-green-100 text-green-700', bar: 'bg-green-600', ring: 'ring-green-600' },
    entreprise: { tile: 'bg-green-800 text-white', bar: 'bg-green-800', ring: 'ring-green-800' },
};

const STATE: Record<Row['state'], { label: string; className: string; dot: string }> = {
    paying: { label: 'Payant', className: 'bg-motriks-soft text-motriks-deep ring-green-600/15', dot: 'bg-motriks' },
    trial: { label: 'En essai', className: 'bg-sky-50 text-sky-700 ring-sky-600/15', dot: 'bg-sky-500' },
    expired: { label: 'Expiré', className: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
    starter: { label: 'Gratuit', className: 'bg-slate-100 text-slate-600 ring-slate-500/15', dot: 'bg-slate-400' },
};

type Status = 'all' | 'attention' | 'paying' | 'trial';

/** À relancer : échéance proche, ou forfait qui vient d'expirer. */
const needsAttention = (r: Row) => r.soon || r.state === 'expired';

const short = (label: string) => label.replace('Motriks ', '');

/** Une phrase courte sur l'échéance, mise en avant quand elle approche ou est passée. */
function deadline(r: Row): { text: string; className: string } {
    if (r.state === 'starter') {
        return { text: 'Sans échéance', className: 'text-slate-400' };
    }

    if (r.state === 'expired') {
        return { text: `${short(r.subscribed_plan)} terminé le ${r.ends_on}`, className: 'font-medium text-red-700' };
    }

    if (!r.ends_on) {
        return { text: 'Sans date de fin', className: 'text-slate-600' };
    }

    if (r.soon) {
        const left = r.days_left === 0 ? 'aujourd’hui' : `dans ${r.days_left} jour${(r.days_left ?? 0) > 1 ? 's' : ''}`;

        return { text: `Se termine ${left}`, className: 'font-medium text-amber-700' };
    }

    return { text: `Jusqu’au ${r.ends_on}`, className: 'text-slate-600' };
}

/** Abonnements : les forfaits et ce qu'ils rapportent, puis chaque entreprise avec son échéance. */
export default function AdminSubscriptions({ rows, stats, plans, methods, packs, soon_days }: Props) {
    const [planFilter, setPlanFilter] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('all');
    const [query, setQuery] = useState('');
    const [paying, setPaying] = useState<Row | null>(null);

    const attention = rows.filter(needsAttention).length;

    // Chiffres par forfait : entreprises, payantes, en essai, revenu mensuel
    const byPlan = useMemo(
        () =>
            plans.map((p) => {
                const companies = rows.filter((r) => r.plan_key === p.key);

                return {
                    ...p,
                    count: companies.length,
                    paying: companies.filter((r) => r.state === 'paying').length,
                    trial: companies.filter((r) => r.state === 'trial').length,
                    mrr: companies.filter((r) => r.state === 'paying').reduce((sum, r) => sum + r.monthly_price, 0),
                };
            }),
        [plans, rows],
    );

    const inPlan = useMemo(() => (planFilter ? rows.filter((r) => r.plan_key === planFilter) : rows), [rows, planFilter]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();

        return inPlan
            .filter((r) => (status === 'all' ? true : status === 'attention' ? needsAttention(r) : r.state === status))
            .filter((r) => !q || r.name.toLowerCase().includes(q))
            .sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)));
    }, [inPlan, status, query]);

    const sendReminder = (r: Row) => router.post(remind(r.id).url, {}, { preserveScroll: true, onError: toastFormError });

    const selectedPlan = byPlan.find((p) => p.key === planFilter);

    const metrics = [
        {
            label: 'Encaissé ce mois-ci',
            value: number.format(stats.paid_month),
            unit: 'FCFA',
            sub: `${number.format(stats.paid_year)} FCFA depuis janvier`,
        },
        {
            label: 'Revenu mensuel attendu',
            value: number.format(stats.mrr),
            unit: 'FCFA',
            sub: `${stats.paying} entreprise${stats.paying > 1 ? 's' : ''} payante${stats.paying > 1 ? 's' : ''}`,
        },
        { label: 'À relancer', value: String(attention), unit: '', sub: `échéance sous ${soon_days} jours ou expirée`, alert: attention > 0 },
    ];

    return (
        <>
            <Head title="Abonnements" />

            <Page
                title="Abonnements"
                description="Les forfaits de vos clients, ce qu’ils rapportent et leurs échéances."
                actions={
                    <Link href={invoicesIndex().url} className={buttonClass('secondary')}>
                        <Receipt />
                        Factures
                    </Link>
                }
            >
                <div className="flex flex-col gap-8">
                    {/* Chiffres clés */}
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {metrics.map((m) => (
                            <div
                                key={m.label}
                                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-xs last:col-span-2 sm:px-6 sm:py-5 sm:last:col-span-1"
                            >
                                <dt className="text-xs text-slate-500 sm:text-sm">{m.label}</dt>
                                <dd
                                    className={cn(
                                        'mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:mt-2 sm:text-3xl',
                                        m.alert ? 'text-amber-600' : 'text-ink',
                                    )}
                                >
                                    {m.value}
                                    {m.unit && <span className="ml-1 text-sm font-medium text-slate-400 sm:ml-1.5 sm:text-base">{m.unit}</span>}
                                </dd>
                                <p className="mt-1 text-xs text-slate-400">{m.sub}</p>
                            </div>
                        ))}
                    </dl>

                    {/* Une carte par forfait ; un clic filtre la liste */}
                    <section>
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <h2 className="text-[15px] font-semibold text-ink">Forfaits</h2>
                            {planFilter && (
                                <button
                                    type="button"
                                    onClick={() => setPlanFilter(null)}
                                    className="text-sm font-medium text-motriks-deep hover:underline"
                                >
                                    Voir tous les forfaits
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                            {byPlan.map((p) => {
                                const tone = PLAN_TONE[p.key] ?? PLAN_TONE.starter;
                                const active = planFilter === p.key;
                                const share = rows.length ? Math.round((p.count / rows.length) * 100) : 0;

                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setPlanFilter(active ? null : p.key)}
                                        className={cn(
                                            'flex flex-col rounded-2xl border bg-white p-4 text-left shadow-xs sm:p-5 transition-all focus-visible:ring-2 focus-visible:ring-motriks/30 focus-visible:outline-none',
                                            active
                                                ? cn('border-transparent ring-2', tone.ring)
                                                : 'border-slate-200/80 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className={cn('flex size-9 items-center justify-center rounded-xl sm:size-10', tone.tile)}>
                                                <Blocks className="size-[18px]" />
                                            </span>
                                            {active && (
                                                <span className="flex size-5 items-center justify-center rounded-full bg-motriks text-white">
                                                    <Check className="size-3" strokeWidth={3} />
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-3 text-sm font-semibold text-ink sm:mt-4">{short(p.label)}</p>
                                        <p className="text-xs text-slate-500">
                                            {p.price === 0 ? 'Gratuit' : `${number.format(p.price)} FCFA / mois`}
                                        </p>

                                        <p className="mt-3 flex items-baseline gap-1.5 sm:mt-4">
                                            <span className="text-2xl font-semibold tracking-tight text-ink tabular-nums sm:text-3xl">{p.count}</span>
                                            <span className="text-sm text-slate-500">entreprise{p.count > 1 ? 's' : ''}</span>
                                        </p>

                                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={cn('h-full rounded-full transition-all', tone.bar)}
                                                style={{ width: `${p.count ? Math.max(share, 4) : 0}%` }}
                                            />
                                        </div>

                                        <div className="mt-3 flex flex-col gap-0.5 border-t border-slate-100 pt-3 text-xs sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                            <span className="text-slate-500">
                                                {p.price === 0
                                                    ? `${share} % des clients`
                                                    : `${p.paying} payante${p.paying > 1 ? 's' : ''}${p.trial ? ` · ${p.trial} en essai` : ''}`}
                                            </span>
                                            {p.price > 0 && (
                                                <span className="font-semibold text-ink tabular-nums">
                                                    {number.format(p.mrr)} <span className="font-normal text-slate-400">/ mois</span>
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Entreprises */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-semibold text-ink">
                                    {selectedPlan ? `Entreprises en ${short(selectedPlan.label)}` : 'Toutes les entreprises'}
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {shown.length} sur {inPlan.length}
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Segmented
                                    label="Filtrer par état"
                                    value={status}
                                    onChange={setStatus}
                                    options={[
                                        { value: 'all', label: 'Toutes' },
                                        { value: 'attention', label: 'À relancer', count: inPlan.filter(needsAttention).length },
                                        { value: 'paying', label: 'Payantes' },
                                        { value: 'trial', label: 'En essai' },
                                    ]}
                                />
                                <div className="sm:w-56">
                                    <TextInput
                                        icon={Search}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Rechercher"
                                        aria-label="Rechercher une entreprise"
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {shown.length === 0 ? (
                            <QuietEmpty icon={Search} title="Aucune entreprise ne correspond">
                                Modifiez la recherche, l’état ou le forfait choisi.
                            </QuietEmpty>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {shown.map((r) => {
                                    const state = STATE[r.state];
                                    const due = deadline(r);

                                    return (
                                        <li
                                            key={r.id}
                                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 px-5 py-5 transition-colors hover:bg-slate-50/60 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
                                        >
                                            {/* Entreprise */}
                                            <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3.5">
                                                <CompanyAvatar name={r.name} muted={r.status === 'suspended'} className="size-11" />
                                                <div className="min-w-0">
                                                    <Link
                                                        href={companyShow(r.id).url}
                                                        className="block truncate font-semibold text-ink hover:text-motriks-deep"
                                                    >
                                                        {r.name}
                                                    </Link>
                                                    <p className="mt-0.5 truncate text-sm text-slate-500">
                                                        {short(r.plan)}
                                                        {r.monthly_price > 0 && ` · ${number.format(r.monthly_price)} FCFA / mois`}
                                                        {packSummary(r.extra_packs, r.supervisor_packs) && ` · +${packSummary(r.extra_packs, r.supervisor_packs)}`}
                                                        {r.status === 'suspended' && ' · suspendue'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* État et échéance */}
                                            <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-[3.6rem] lg:col-span-1 lg:block lg:pl-0">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                                                        state.className,
                                                    )}
                                                >
                                                    <span className={cn('size-1.5 rounded-full', state.dot)} />
                                                    {state.label}
                                                </span>
                                                <p className={cn('text-sm lg:mt-1.5', due.className)}>{due.text}</p>
                                            </div>

                                            {/* Dernier paiement */}
                                            <div className="hidden lg:block">
                                                <p className="text-xs text-slate-400">Dernier paiement</p>
                                                <p className="mt-0.5 text-sm text-slate-700 tabular-nums">{r.last_paid ?? '—'}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="col-start-2 row-start-1 flex items-center gap-1.5 lg:col-start-4">
                                                <ActionButton
                                                    size="sm"
                                                    variant="secondary"
                                                    icon={<Banknote />}
                                                    onClick={() => setPaying(r)}
                                                    className="hidden sm:inline-flex"
                                                >
                                                    Paiement reçu
                                                </ActionButton>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            aria-label={`Actions pour ${r.name}`}
                                                            className={cn(buttonClass('ghost', 'sm'), 'size-8 px-0')}
                                                        >
                                                            <MoreHorizontal />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                                                        <DropdownMenuItem onSelect={() => setPaying(r)} className="sm:hidden">
                                                            <Banknote />
                                                            Paiement reçu
                                                        </DropdownMenuItem>
                                                        {r.can_remind && (
                                                            <DropdownMenuItem onSelect={() => sendReminder(r)}>
                                                                <BellRing />
                                                                Relancer le gérant
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem asChild>
                                                            <Link href={companyPlan(r.id).url}>
                                                                <Blocks />
                                                                Changer de forfait
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={companyShow(r.id).url}>
                                                                <Building2 />
                                                                Voir la fiche
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            </Page>

            {paying && (
                <RecordPaymentModal
                    company={{ id: paying.id, name: paying.name }}
                    plans={plans}
                    methods={methods}
                    packs={packs}
                    currentPlan={paying.subscribed_key}
                    currentPacks={paying.extra_packs}
                    currentSupervisorPacks={paying.supervisor_packs}
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
