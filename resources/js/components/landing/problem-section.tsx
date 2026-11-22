import { PROBLEMS, SOLUTIONS } from '@/components/landing/content';
import { Check, Cross, SectionTitle } from '@/components/landing/primitives';

/* Problème / solution : avant et avec Motriks */
export function ProblemSection() {
    return (
        <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Pourquoi Motriks"
                    title="Fini le chaos des messages et des tableurs"
                    text="Ce qui vous fait perdre du temps aujourd'hui, Motriks le règle automatiquement."
                />

                <div className="relative mt-14 grid gap-5 lg:grid-cols-2 lg:gap-8">
                    {/* avant */}
                    <div
                        data-reveal
                        className="rounded-[1.75rem] border border-slate-200 bg-white/60 p-7 sm:p-9"
                    >
                        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold tracking-wider text-red-500 uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Aujourd'hui
                        </span>
                        <h3 className="mt-4 text-xl font-bold text-slate-500">
                            Sans Motriks
                        </h3>
                        <img
                            src="/images/landing/cahier-rapport.webp"
                            alt="Rapport tenu à la main dans un cahier"
                            width={1200}
                            height={675}
                            loading="lazy"
                            className="mt-6 aspect-[16/7] w-full rounded-2xl object-cover grayscale-[35%]"
                        />
                        <ul className="mt-7 space-y-3">
                            {PROBLEMS.map((p) => (
                                <li
                                    key={p}
                                    className="flex min-h-[3.25rem] items-center gap-3.5 rounded-2xl px-1 text-slate-500"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400">
                                        <Cross className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="leading-snug">{p}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* pastille centrale */}
                    <div
                        className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
                        aria-hidden="true"
                    >
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-50 bg-green-600 text-white shadow-xl shadow-green-600/30">
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 24 24"
                            >
                                <path d="M5 12h14m-6-6l6 6-6 6" />
                            </svg>
                        </span>
                    </div>

                    {/* après */}
                    <div
                        data-reveal
                        className="rounded-[1.75rem] bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 p-px shadow-2xl shadow-green-700/15"
                    >
                        <div className="relative h-full overflow-hidden rounded-[calc(1.75rem-1px)] bg-white p-7 sm:p-9">
                            <div
                                className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-green-100/70 blur-3xl"
                                aria-hidden="true"
                            />
                            <div className="relative">
                                <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold tracking-wider text-green-700 uppercase">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                                    Avec Motriks
                                </span>
                                <h3 className="mt-4 text-xl font-bold text-slate-900">
                                    Tout est automatique
                                </h3>
                                <img
                                    src="/images/landing/desktop-rapport-detail.webp"
                                    alt="Rapport du jour reçu par le gérant dans Motriks"
                                    width={1600}
                                    height={1000}
                                    loading="lazy"
                                    className="mt-6 aspect-[16/7] w-full rounded-2xl border border-slate-200 object-cover object-[0_15%]"
                                />
                                <ul className="mt-7 space-y-3">
                                    {SOLUTIONS.map((sol) => (
                                        <li
                                            key={sol}
                                            className="flex min-h-[3.25rem] items-center gap-3.5 rounded-2xl px-1 font-medium text-slate-800 transition hover:bg-green-50/70"
                                        >
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-md shadow-green-600/25">
                                                <Check className="h-3.5 w-3.5 text-white" />
                                            </span>
                                            <span className="leading-snug">
                                                {sol}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
