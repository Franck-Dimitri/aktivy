import { Link } from '@inertiajs/react';
import { PLANS } from '@/components/landing/content';
import { Check } from '@/components/landing/primitives';
import { Kicker } from '@/components/landing/sections';

/* Tarifs : les forfaits Motriks */
export function PricingSection() {
    return (
        <section
            id="tarifs"
            className="scroll-mt-24 bg-[#F5F6F4] py-20 lg:py-28"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <Kicker>Tarifs</Kicker>
                    <h2 className="mt-5 text-3xl leading-[1.08] font-extrabold tracking-tight text-balance text-slate-900 sm:text-4xl lg:text-5xl">
                        Un forfait à la taille{' '}
                        <span className="text-green-700">de votre réseau.</span>
                    </h2>
                    <p className="mt-5 text-lg text-slate-600">
                        Commencez gratuitement avec Motriks Starter. Toute
                        nouvelle entreprise profite de 1 mois offert sur Motriks
                        Business.
                    </p>
                </div>

                <div className="mt-12 grid gap-0 border-t-2 border-slate-900 sm:grid-cols-2 xl:grid-cols-4">
                    {PLANS.map((p) => (
                        <div
                            key={p.name}
                            data-reveal
                            className={`flex flex-col border-b border-slate-200 p-8 sm:border-r ${
                                p.highlight
                                    ? 'bg-white shadow-[inset_0_4px_0_#027a48]'
                                    : 'bg-white/60'
                            }`}
                        >
                            {p.highlight && (
                                <span className="mb-4 w-fit text-xs font-bold tracking-[0.2em] text-green-700 uppercase">
                                    Recommandé
                                </span>
                            )}
                            <h3 className="text-xl font-bold text-slate-900">
                                {p.name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-600">
                                {p.description}
                            </p>
                            <p className="mt-6">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    {p.price}
                                </span>
                                {p.unit && (
                                    <span className="ml-2 text-sm text-slate-500">
                                        {p.unit}
                                    </span>
                                )}
                            </p>
                            <ul className="mt-6 flex-1 space-y-3">
                                {p.features.map((f) => (
                                    <li
                                        key={f}
                                        className="flex items-start gap-3 text-sm text-slate-700"
                                    >
                                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/register"
                                className={`mt-8 px-5 py-3 text-center text-sm font-semibold transition ${
                                    p.highlight
                                        ? 'bg-slate-900 text-white hover:bg-slate-700'
                                        : 'border border-slate-300 text-slate-900 hover:border-slate-900'
                                }`}
                            >
                                {p.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-sm text-slate-500">
                    Packs d’extension : +5 hôtesses et +5 points de vente pour
                    11 500 FCFA par mois, +1 superviseur pour 1 500 FCFA par
                    mois. Paiement à l’année : 10 mois payés pour 12.
                </p>
            </div>
        </section>
    );
}
