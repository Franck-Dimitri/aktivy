import { STEPS, PERSONAS, LOCAL } from '@/components/landing/content';
import { Icon, SectionTitle } from '@/components/landing/primitives';

/* Démarrage en trois étapes et publics visés */
export function StartSection() {
    return (
        <section className="py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Démarrage"
                    title="Opérationnel en trois étapes"
                    text="Pensé pour les gérants, les responsables commerciaux, les agences d'hôtesses et leurs comptables."
                />
                {/* étapes : un filet en haut de chaque colonne, l'étape en cours marquée d'un trait vert */}
                <ol
                    data-reveal
                    className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8"
                >
                    {STEPS.map((st, i) => (
                        <li
                            key={st.title}
                            className="relative border-t border-slate-200 pt-6"
                        >
                            <span
                                className="absolute -top-px left-0 h-px w-12 bg-green-600"
                                aria-hidden="true"
                            />
                            <div className="flex items-baseline justify-between gap-4 text-xs">
                                <span className="font-semibold text-green-700">
                                    Étape {i + 1}
                                </span>
                                <span className="text-slate-500">{st.tag}</span>
                            </div>
                            <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                                {st.title}
                            </h3>
                            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                                {st.text}
                            </p>
                        </li>
                    ))}
                </ol>

                <div
                    data-reveal
                    className="mt-16 rounded-2xl bg-slate-50 p-7 sm:p-10"
                >
                    <p className="text-sm font-medium text-slate-500">
                        Conçu pour
                    </p>
                    <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
                        {PERSONAS.map((p) => (
                            <div key={p.title}>
                                <h3 className="text-[15px] font-semibold text-slate-900">
                                    {p.title}
                                </h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                                    {p.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* Atouts locaux : connexion, téléphones, paiement mobile */
export function LocalSection() {
    return (
        <section className="py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Adapté à votre réalité"
                    title="Pensé pour le terrain africain"
                    text="Connexion variable, téléphones d'entrée de gamme, paiement mobile : Motriks a été conçu avec ces contraintes."
                />
                {/* quatre colonnes séparées par des filets verticaux, sans cartes */}
                <div
                    data-reveal
                    className="mt-14 grid gap-y-10 border-t border-slate-200 pt-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-slate-200"
                >
                    {LOCAL.map((l) => (
                        <div
                            key={l.title}
                            className="lg:px-8 lg:first:pl-0 lg:last:pr-0"
                        >
                            <Icon
                                name={l.icon}
                                className="h-5 w-5 text-green-600"
                            />
                            <h3 className="mt-6 text-base font-semibold tracking-tight text-slate-900">
                                {l.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                {l.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
