import { Link } from '@inertiajs/react';
import { STATS } from '@/components/landing/content';
import { Check } from '@/components/landing/primitives';
import { HeroDashboard } from '@/components/landing/hero-dashboard';

/* Hero : accroche, appels à l’action et tableau de bord incliné */
export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-white">
            {/* décor : grande courbe douce à gauche et disque vert en haut à droite */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
            >
                <svg
                    className="absolute top-0 left-0 h-[640px] w-[min(720px,100%)]"
                    viewBox="0 0 720 640"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient
                            id="heroSweep"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                        >
                            <stop offset="0" stopColor="#9fe0bd" />
                            <stop offset="0.55" stopColor="#d6f1e3" />
                            <stop offset="1" stopColor="#ffffff" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0 0H640C580 240 340 490 0 640Z"
                        fill="url(#heroSweep)"
                    />
                </svg>
            </div>

            <div className="relative mx-auto grid max-w-[90rem] items-start gap-12 px-4 pt-28 pb-20 sm:px-6 sm:pt-32 sm:pb-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:px-10 lg:pt-36">
                <div>
                    <h1
                        data-reveal
                        className="text-4xl leading-[1.05] font-extrabold tracking-tight text-slate-950 min-[390px]:text-5xl sm:text-6xl lg:text-[3.6rem]"
                    >
                        Pilotez vos équipes terrain en temps réel, sans saisie
                        manuelle
                    </h1>
                    <p
                        data-reveal
                        className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600"
                    >
                        Motriks remplace les messages WhatsApp, les tableurs
                        éparpillés et les rapports papier par un seul outil, et
                        laisse l'intelligence artificielle vous dire où agir.
                    </p>
                    <div
                        data-reveal
                        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                        <Link
                            href="/register"
                            className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-green-600 pr-1.5 pl-6 text-sm font-semibold text-white shadow-lg ring-1 shadow-green-600/30 ring-white/10 transition ring-inset hover:bg-green-700"
                        >
                            Commencer gratuitement
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-green-700 transition-transform group-hover:translate-x-0.5">
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M5 12h14m-6-6l6 6-6 6" />
                                </svg>
                            </span>
                        </Link>
                        <a
                            href="#fonctionnalites"
                            className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-6 text-sm font-semibold text-slate-800 backdrop-blur transition hover:border-green-300 hover:bg-white hover:text-green-700"
                        >
                            Découvrir les fonctionnalités
                        </a>
                    </div>
                    <ul
                        data-reveal
                        className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500"
                    >
                        <li className="flex items-center gap-1.5">
                            <Check className="h-4 w-4 text-green-600" /> Sans
                            carte bancaire
                        </li>
                        <li className="flex items-center gap-1.5">
                            <Check className="h-4 w-4 text-green-600" /> 1 mois
                            d’essai gratuit
                        </li>
                        <li className="flex items-center gap-1.5">
                            <Check className="h-4 w-4 text-green-600" />{' '}
                            Fonctionne hors-ligne
                        </li>
                    </ul>

                    <dl
                        data-reveal
                        className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200/70 pt-5 sm:grid-cols-4"
                    >
                        {STATS.map((st) => (
                            <div key={st.label}>
                                <dt className="text-base font-bold text-green-700/70">
                                    {st.value}
                                </dt>
                                <dd className="mt-0.5 text-[11px] leading-tight text-slate-500">
                                    {st.label}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* la fenêtre d'application est inclinée et déborde à droite de l'écran */}
                <div data-reveal className="lg:-mt-2 lg:-mr-[30vw]">
                    <div className="hero-tilt w-full lg:w-[920px]">
                        <HeroDashboard />
                    </div>
                </div>
            </div>
        </section>
    );
}
