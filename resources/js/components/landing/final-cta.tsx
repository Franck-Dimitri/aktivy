import { Link } from '@inertiajs/react';
import { CONTACT } from '@/lib/contact';
import { H2, Eyebrow } from '@/components/landing/primitives';

/* Appel à l’action final */
export function FinalCta() {
    return (
        <section id="contact" className="scroll-mt-24 pb-20 lg:pb-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                    data-reveal
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 sm:px-10 sm:py-14 lg:px-14"
                >
                    <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
                        <div className="lg:col-span-7">
                            <Eyebrow>Démarrer</Eyebrow>
                            <h2 className={`${H2} text-slate-950`}>
                                Essayez Motriks avec votre équipe
                            </h2>
                            <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-slate-500 sm:text-lg">
                                Votre espace est prêt en quelques minutes, sans
                                carte bancaire. Vous préférez en parler d'abord
                                ? Écrivez-nous, on vous répond dans la journée.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
                            <Link
                                href="/register"
                                className="inline-flex h-12 items-center justify-center rounded-full bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                            >
                                Créer mon espace
                            </Link>
                            <a
                                href={`https://wa.me/${CONTACT.whatsapp}`}
                                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:text-slate-950"
                            >
                                Écrire sur WhatsApp
                            </a>
                        </div>
                    </div>

                    <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-500">
                        <span className="font-medium text-slate-700">
                            Entreprises pilotes :
                        </span>{' '}
                        nous configurons votre espace et formons vos équipes
                        gratuitement, en échange de vos retours sur le produit.
                    </p>
                </div>
            </div>
        </section>
    );
}
