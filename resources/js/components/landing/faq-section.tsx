import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { CONTACT } from '@/lib/contact';
import { FAQS } from '@/components/landing/content';
import { H2, Eyebrow } from '@/components/landing/primitives';

/* FAQ : titre et contact à gauche, accordéon à droite */
export function FaqSection() {
    const [openFaq, setOpenFaq] = useState(0);
    return (
        <section id="faq" className="scroll-mt-24 py-20 lg:py-28">
            <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-6 sm:px-10 lg:grid-cols-12 lg:gap-10 lg:px-16">
                {/* colonne gauche : titre et contact, fixe pendant le défilement */}
                <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
                    <div data-reveal>
                        <Eyebrow>FAQ</Eyebrow>
                        <h2 className={`${H2} text-slate-950`}>
                            Les réponses à vos questions
                        </h2>
                        <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-slate-500 sm:text-lg">
                            Sécurité, essai, abonnement, données : l'essentiel
                            pour démarrer sereinement avec Motriks.
                        </p>
                    </div>

                    <div
                        data-reveal
                        className="mt-10 max-w-md border-t border-slate-200 pt-8"
                    >
                        <p className="text-[15px] font-semibold text-slate-900">
                            Vous ne trouvez pas votre réponse ?
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                            Notre équipe vous répond directement, en général
                            dans la journée.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                            <a
                                href={`https://wa.me/${CONTACT.whatsapp}`}
                                className="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                            >
                                Écrire sur WhatsApp
                            </a>
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                            >
                                Nous contacter
                            </Link>
                        </div>
                    </div>
                </div>

                {/* colonne droite : accordéon */}
                <div
                    data-reveal
                    className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-7"
                >
                    {FAQS.map((f, i) => {
                        const open = openFaq === i;
                        return (
                            <div key={f.q}>
                                <button
                                    type="button"
                                    id={`faq-q-${i}`}
                                    onClick={() => setOpenFaq(open ? -1 : i)}
                                    aria-expanded={open}
                                    aria-controls={`faq-a-${i}`}
                                    className="group flex w-full items-center gap-6 py-6 text-left"
                                >
                                    <span
                                        className={`flex-1 text-base font-medium transition-colors sm:text-[17px] ${open ? 'text-slate-950' : 'text-slate-700 group-hover:text-slate-950'}`}
                                    >
                                        {f.q}
                                    </span>
                                    <svg
                                        className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-45 text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </button>
                                {/* ouverture fluide : la hauteur s'anime via grid-template-rows */}
                                <div
                                    id={`faq-a-${i}`}
                                    role="region"
                                    aria-labelledby={`faq-q-${i}`}
                                    className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
                                        open
                                            ? 'grid-rows-[1fr] opacity-100'
                                            : 'grid-rows-[0fr] opacity-0'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <p className="max-w-2xl pr-10 pb-6 text-[15px] leading-relaxed text-slate-500">
                                            {f.a}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
