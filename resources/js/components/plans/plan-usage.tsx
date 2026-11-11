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
    /** Packs hôtesses (+5 hôtesses / +5 points de vente) en vigueur. */
    extra_packs: number;
    /** Packs superviseur (+1 superviseur) en vigueur. */
    supervisor_packs: number;
    monthly_price: number;
    limits: Record<string, number | null>;
    usage: {
        hostesses: number;
        sites: number;
        supervisors: number;
        events_per_month: number;
    };
};

/** Les deux packs d'extension, tels que renvoyés par App\Enums\Plan::packCatalog(). */
export type PackCatalog = {
    hostesses: { price: number; hostesses: number; sites: number };
    supervisors: { price: number; supervisors: number };
};

/** « 2 packs hôtesses et 1 pack superviseur », ou null s'il n'y en a aucun. */
export function packSummary(hostessPacks: number, supervisorPacks: number): string | null {
    const parts = [
        hostessPacks > 0 ? `${hostessPacks} pack${hostessPacks > 1 ? 's' : ''} hôtesses` : null,
        supervisorPacks > 0 ? `${supervisorPacks} pack${supervisorPacks > 1 ? 's' : ''} superviseur` : null,
    ].filter(Boolean);

    return parts.length ? parts.join(' et ') : null;
}

/** Limites qui se comptent (le gérant est toujours inclus, les comptables ne sont pas limités). */
export const USAGE_ROWS: { key: keyof PlanState['usage']; label: string }[] = [
    { key: 'hostesses', label: 'Hôtesses' },
    { key: 'sites', label: 'Points de vente' },
    { key: 'supervisors', label: 'Superviseurs' },
    { key: 'events_per_month', label: 'Événements ce mois-ci' },
];

/** Jauges « utilisé / limite » des limites qui se comptent. */
export function PlanUsageList({ plan }: { plan: PlanState }) {
    return (
        <ul className="flex flex-col gap-4 p-5">
            {USAGE_ROWS.map(({ key, label }) => {
                const used = plan.usage[key];
                const limit = plan.limits[key];
                const ratio = limit ? Math.min(1, used / limit) : 0;
                const full = limit !== null && used >= limit && used > 0;

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
