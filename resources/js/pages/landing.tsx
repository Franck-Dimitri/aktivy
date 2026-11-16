import { useEffect, useState, type ReactNode } from 'react';
import LandingFooter from '@/components/landing/footer';
import { Seo } from '@/components/seo';
import { isStandalone } from '@/lib/pwa';
import { AI_FEATURES, FAQS } from '@/components/landing/content';
import { SectionTitle } from '@/components/landing/primitives';
import {
    REVEAL_CSS,
    useScrollReveal,
} from '@/components/landing/use-scroll-reveal';
import { AiTimeline } from '@/components/landing/ai-timeline';
import { FeatureGrid } from '@/components/landing/feature-grid';
import { AssistantDemo } from '@/components/landing/assistant-demo';
import { LandingNavbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { ProblemSection } from '@/components/landing/problem-section';
import {
    StartSection,
    LocalSection,
} from '@/components/landing/onboarding-sections';
import { PricingSection } from '@/components/landing/pricing-section';
import { FaqSection } from '@/components/landing/faq-section';
import { FinalCta } from '@/components/landing/final-cta';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/* Données structurées schema.org : l'éditeur, le site, le logiciel et la FAQ */
// Données structurées propres à l'accueil : la FAQ (organisation, site et application : PublicPages, côté serveur)
const FAQ_JSON_LD = [
    {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    },
];

export default function Landing({
    paymentLogos,
}: {
    paymentLogos?: { name: string; url: string }[];
}) {
    useScrollReveal();

    // Application installée : jamais de page d'accueil (ex. après une déconnexion), comme une application mobile
    const [inApp] = useState(
        () => typeof window !== 'undefined' && isStandalone(),
    );
    useEffect(() => {
        if (inApp) {
            window.location.replace('/app');
        }
    }, [inApp]);

    // Arrivée depuis un lien du type /accueil#tarifs : on descend jusqu'à la section
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (!id) {
            return;
        }
        const timer = window.setTimeout(
            () => document.getElementById(id)?.scrollIntoView(),
            120,
        );
        return () => window.clearTimeout(timer);
    }, []);

    if (inApp) {
        return null;
    }

    return (
        <>
            <Seo jsonLd={FAQ_JSON_LD} />

            <div className="min-h-screen scroll-smooth bg-white font-sans text-slate-900 antialiased">
                <style>{REVEAL_CSS}</style>
                {/* ------------------------------ Navbar ------------------------------ */}
                <LandingNavbar />

                {/* ------------------------------- Hero ------------------------------- */}
                <HeroSection />

                {/* ------------------------- Problème / solution ----------------------- */}
                <ProblemSection />

                {/* ---------------------------- Fonctionnalités ------------------------ */}
                <section id="fonctionnalites" className="scroll-mt-24 py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            eyebrow="Fonctionnalités"
                            title="Tout ce qu'il faut pour gérer le terrain"
                            text="Chaque forfait ajoute des fonctions : du suivi terrain gratuit jusqu'aux campagnes et au reporting complet."
                        />
                        <FeatureGrid />
                    </div>
                </section>

                {/* --------------------------------- IA -------------------------------- */}
                <section
                    id="ia"
                    className="scroll-mt-24 bg-slate-900 py-20 text-white"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            dark
                            eyebrow="Intelligence artificielle"
                            title="Une IA utile, qui vous dit où agir"
                            text="L'IA s'appuie sur les données déjà collectées : aucune saisie supplémentaire. Chaque recommandation indique les données sur lesquelles elle repose, et la décision finale reste la vôtre."
                        />

                        {/* à gauche la timeline ondulée, à droite la démo : même hauteur sur ordinateur */}
                        <div className="mt-14 grid items-stretch gap-12 lg:mt-16 lg:grid-cols-2 lg:gap-10">
                            <AiTimeline items={AI_FEATURES} />

                            <div data-reveal>
                                <AssistantDemo />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------------- Démarrage et publics visés -------------------- */}
                <StartSection />

                {/* ------------------------------ Atouts locaux ------------------------ */}
                <LocalSection />

                {/* --------------------------------- Tarifs ---------------------------- */}
                <PricingSection />

                {/* ---------------------------------- FAQ ------------------------------ */}
                <FaqSection />

                {/* --------------------------------- CTA final ------------------------- */}
                {/* Encadré clair aligné sur la grille de la page : titre à gauche, boutons à droite */}
                <FinalCta />

                <LandingFooter paymentLogos={paymentLogos} />
            </div>
        </>
    );
}

/* Pas de sidebar : la landing s'affiche sans le layout de l'application */
Landing.layout = (page: ReactNode) => page;
