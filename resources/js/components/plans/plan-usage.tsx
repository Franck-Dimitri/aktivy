import { cn } from '@/lib/utils';

/** État du forfait d'une entreprise, tel que renvoyé par App\Support\Plans\PlanPresenter::state(). */
export type PlanState = {
    key: string;
    label: string;
    price: number;
    subscribed_key: string;
    subscribed_label: string;
    expired: boolean;
    trial: boolean;
    ends_on: string | null;
    ends_on_iso: string | null;
    days_left: number | null;
    extra_packs: number;
    monthly_price: number;
    limits: Record<string, number | null>;
    usage: {
        hostesses: number;
        sites: number;
        backoffice: number;
        events_per_month: number;
    };
};

const ROWS: { key: keyof PlanState['usage']; label: string }[] = [
    { key: 'hostesses', label: 'Hôtesses' },
    { key: 'sites', label: 'Points de vente' },
    { key: 'backoffice', label: 'Utilisateurs du back-office' },
    { key: 'events_per_month', label: 'Événements ce mois-ci' },
];

/** Jauges « utilisé / limite » des limites qui se comptent. */
export function PlanUsageList({ plan }: { plan: PlanState }) {
    return (
        <ul className="flex flex-col gap-4 p-5">
            {ROWS.map(({ key, label }) => {
                const used = plan.usage[key];
                const limit = plan.limits[key];
                const ratio = limit ? Math.min(1, used / limit) : 0;
                const full = limit !== null && used >= limit;

                return (
                    <li key={key} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="text-slate-600">{label}</span>
                            <span
                                className={cn(
                                    'font-semibold tabular-nums',
                                    full ? 'text-amber-700' : 'text-ink',
                                )}
                            >
                                {used}
                                <span className="font-normal text-slate-400">
                                    {' '}
                                    /{' '}
                                    {limit === null
                                        ? 'illimité'
                                        : limit === 0
                                          ? 'non compris'
                                          : limit}
                                </span>
                            </span>
                        </div>
                        {limit !== null && limit > 0 && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                <div
                                    className={cn(
                                        'h-full rounded-full',
                                        full ? 'bg-amber-500' : 'bg-motriks',
                                    )}
                                    style={{
                                        width: `${Math.max(ratio * 100, used > 0 ? 4 : 0)}%`,
                                    }}
                                />
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
