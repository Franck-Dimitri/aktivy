import { Link } from '@inertiajs/react';
import { PLANS } from '@/components/landing/content';
import { Check, SectionTitle } from '@/components/landing/primitives';

/* Tarifs : les forfaits Motriks */
export function PricingSection() {
    return (
        <section
            id="tarifs"
            className="scroll-mt-24 border-t border-slate-200 bg-white py-24 lg:py-32"
        >
            <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-10 lg:px-16">
                <SectionTitle
                    eyebrow="Tarifs"
                    title="Un forfait à la taille de votre réseau"
                    text="Commencez gratuitement avec Motriks Starter, passez au forfait supérieur quand votre équipe grandit."
                />

                <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {PLANS.map((p) => (
                        <div
                            key={p.name}
                            data-reveal
                            className={`flex flex-col rounded-md p-8 ${
                                p.highlight
                                    ? 'border-2 border-green-600 bg-white shadow-xl shadow-green-600/10'
                                    : 'border border-slate-200 bg-white'
                            }`}
                        >
                            {p.highlight && (
                                <span className="mb-4 w-fit rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
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
                                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/register"
                                className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                                    p.highlight
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'border border-slate-200 text-slate-700 hover:border-green-300 hover:text-green-700'
                                }`}
                            >
                                {p.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-center text-sm text-slate-500">
                    Packs d’extension : +5 hôtesses et +5 points de vente pour
                    11 500 FCFA par mois, +1 superviseur pour 1 500 FCFA par
                    mois. Paiement à l’année : 10 mois payés pour 12.
                </p>
            </div>
        </section>
    );
}
