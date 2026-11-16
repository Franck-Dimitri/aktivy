import MotriksMark from '@/components/motriks-mark';
import { Icon } from '@/components/landing/primitives';

/* Tableau de bord du hero : fenêtre d'application avec barre latérale */
export function HeroDashboard() {
    const nav = [
        { icon: 'grid', label: "Vue d'ensemble", active: true },
        { icon: 'field', label: 'Sites' },
        { icon: 'clock', label: 'Présences' },
        { icon: 'box', label: 'Stocks' },
        { icon: 'file', label: 'Rapports' },
    ];
    const rows = [
        {
            icon: 'field',
            name: 'Carrefour Bastos',
            code: 'site_8f21c4',
            amount: '1 245 000',
            status: 'Ouvert',
            tone: 'bg-green-100 text-green-700',
        },
        {
            icon: 'field',
            name: 'Mvog-Ada',
            code: 'site_3b09de',
            amount: '860 000',
            status: 'Ouvert',
            tone: 'bg-green-100 text-green-700',
        },
        {
            icon: 'field',
            name: 'Mokolo',
            code: 'site_c71a55',
            amount: '0',
            status: 'Pas ouvert',
            tone: 'bg-amber-100 text-amber-700',
        },
        {
            icon: 'field',
            name: 'Essos',
            code: 'site_5e4402',
            amount: '415 000',
            status: 'Ouvert',
            tone: 'bg-green-100 text-green-700',
        },
        {
            icon: 'field',
            name: 'Bonamoussadi',
            code: 'site_a93f10',
            amount: '730 000',
            status: 'Ouvert',
            tone: 'bg-green-100 text-green-700',
        },
        {
            icon: 'field',
            name: 'Biyem-Assi',
            code: 'site_2d7c68',
            amount: '392 000',
            status: 'Ouvert',
            tone: 'bg-green-100 text-green-700',
        },
    ];

    return (
        <div
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white"
            style={{
                WebkitMaskImage:
                    'linear-gradient(to bottom, #000 0%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 96%)',
                maskImage:
                    'linear-gradient(to bottom, #000 0%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 96%)',
            }}
        >
            <div className="flex">
                <aside className="hidden w-56 shrink-0 border-r border-slate-100 bg-slate-50/80 p-5 sm:block">
                    <div className="flex items-center gap-3">
                        <MotriksMark className="size-9 rounded-full" />
                        <p className="text-sm leading-tight font-semibold text-slate-900">
                            Motriks
                            <span className="block text-xs font-normal text-slate-500">
                                Démo Distribution
                            </span>
                        </p>
                    </div>
                    <nav className="mt-8 space-y-1">
                        {nav.map((n) => (
                            <div
                                key={n.label}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                                    n.active
                                        ? 'bg-green-100/80 font-medium text-green-700'
                                        : 'text-slate-500'
                                }`}
                            >
                                <Icon name={n.icon} className="h-4 w-4" />
                                {n.label}
                            </div>
                        ))}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1">
                    <div className="border-b border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-6">
                        Espace entreprise · Démo Distribution
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[
                                {
                                    label: 'Ventes du jour',
                                    value: '2 480 000',
                                    unit: 'FCFA',
                                },
                                {
                                    label: 'Hôtesses actives',
                                    value: '24 / 26',
                                    unit: '',
                                },
                                {
                                    label: 'Sites ouverts',
                                    value: '9 / 10',
                                    unit: '',
                                },
                            ].map((k) => (
                                <div
                                    key={k.label}
                                    className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4"
                                >
                                    <p className="text-xs text-slate-500">
                                        {k.label}
                                    </p>
                                    <p className="mt-2 text-base font-semibold tracking-tight text-slate-900 sm:text-xl">
                                        {k.value}{' '}
                                        <span className="text-xs font-medium text-slate-500">
                                            {k.unit}
                                        </span>
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                            <p className="border-b border-slate-100 px-4 py-3.5 text-sm font-semibold text-slate-900 sm:px-5">
                                Activité des sites
                            </p>
                            {rows.map((r) => (
                                <div
                                    key={r.code}
                                    className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:gap-4 sm:px-5"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <Icon
                                            name={r.icon}
                                            className="h-4 w-4"
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 sm:w-36 sm:flex-none sm:shrink-0">
                                        {r.name}
                                    </span>
                                    <span className="hidden w-28 shrink-0 font-mono text-xs text-slate-500 md:block">
                                        {r.code}
                                    </span>
                                    <span className="hidden flex-1 text-sm text-slate-600 sm:block">
                                        {r.amount} FCFA
                                    </span>
                                    <span
                                        className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${r.tone}`}
                                    >
                                        {r.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
