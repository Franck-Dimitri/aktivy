import { Link } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';

/*
 * Page d'accueil : sections éditoriales (angles droits, vert en rappel, vraies photos et vraies captures).
 * Les captures viennent d'une entreprise de démonstration : noms de produits et de magasins fictifs.
 * Images : public/images/landing (photos Unsplash, licence Unsplash).
 */

const IMG = '/images/landing';

export const INK_BUTTON =
    'inline-flex items-center justify-center gap-3 bg-slate-900 px-7 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none sm:text-base';
export const LINE_BUTTON =
    'inline-flex items-center justify-center gap-3 border border-slate-300 bg-white px-7 py-4 text-sm font-semibold text-slate-900 transition hover:border-slate-900 sm:text-base';

function Arrow() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

/** Petite étiquette de section : carré vert + texte en capitales espacées. */
export function Kicker({ children }: { children: ReactNode }) {
    return (
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.25em] text-green-700 uppercase sm:text-[13px]">
            <span className="h-2.5 w-2.5 bg-green-700" aria-hidden="true" />
            {children}
        </p>
    );
}

function Title({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <h2
            className={`text-3xl leading-[1.08] font-extrabold tracking-tight text-balance text-slate-900 sm:text-4xl lg:text-5xl ${className}`}
        >
            {children}
        </h2>
    );
}

/** Capture d'écran de téléphone : cadre fin, angles droits. */
function Phone({
    src,
    alt,
    className = '',
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    return (
        <div
            className={`overflow-hidden border border-slate-300 bg-white shadow-2xl shadow-slate-900/20 ${className}`}
        >
            <img
                src={`${IMG}/${src}.webp`}
                alt={alt}
                width={600}
                height={1298}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover object-top"
            />
        </div>
    );
}

/** Capture d'écran d'ordinateur dans une fenêtre de navigateur. */
function Browser({
    src,
    alt,
    className = '',
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    return (
        <div
            className={`border border-slate-300 bg-white shadow-2xl shadow-slate-900/15 ${className}`}
        >
            <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-[#F5F6F4] px-4 text-xs font-semibold text-slate-500">
                <i className="h-2 w-2 bg-slate-300" />
                <i className="h-2 w-2 bg-slate-300" />
                <i className="h-2 w-2 bg-slate-300" />
                <span className="ml-2">motriks.com</span>
            </div>
            <img
                src={`${IMG}/${src}.webp`}
                alt={alt}
                width={1600}
                height={1000}
                loading="lazy"
                decoding="async"
                className="block w-full"
            />
        </div>
    );
}

/** Trame millimétrée très discrète, en fond de section. */
const GRID_BG = {
    backgroundImage:
        'linear-gradient(rgba(15,23,42,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.04) 1px,transparent 1px)',
    backgroundSize: '48px 48px',
};

/* ------------------------------------------------------------------ */
/*  1. Haut de page                                                    */
/* ------------------------------------------------------------------ */

export function Hero() {
    return (
        <section
            className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24"
            style={GRID_BG}
        >
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
                <div className="lg:col-span-6">
                    <Kicker>Gestion des équipes terrain</Kicker>
                    <h1 className="mt-6 text-[44px] leading-[1.02] font-extrabold tracking-tight text-balance text-slate-900 sm:text-6xl lg:text-[68px]">
                        Vos équipes terrain,{' '}
                        <span className="text-green-700">enfin visibles.</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                        Présences, ventes et stock de chaque point de vente, sur
                        le téléphone de vos hôtesses et sur votre écran. Même
                        sans réseau.
                    </p>
                    <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                        <Link href="/register" className={INK_BUTTON}>
                            Essayer 1 mois gratuit <Arrow />
                        </Link>
                        <a href="#comment-ca-marche" className={LINE_BUTTON}>
                            Voir comment ça marche
                        </a>
                    </div>
                    <p className="mt-5 text-sm font-medium text-slate-500">
                        Forfait Business offert pendant 1 mois · sans carte
                        bancaire · sans engagement
                    </p>
                </div>

                <div className="relative lg:col-span-6" data-reveal>
                    <div className="aspect-[4/3] overflow-hidden lg:aspect-[5/4]">
                        <img
                            src={`${IMG}/supermarche-rayon.webp`}
                            alt="Deux clientes choisissent des produits dans le rayon d’un supermarché"
                            width={1600}
                            height={1067}
                            fetchPriority="high"
                            className="h-full w-full object-cover object-[30%_50%]"
                        />
                    </div>
                    <Phone
                        src="mobile-rapport"
                        alt="Rapport du jour de l’hôtesse dans l’application Motriks"
                        className="lp-float absolute -bottom-10 left-3 h-[300px] w-[150px] sm:-left-10 sm:h-[420px] sm:w-[200px]"
                    />
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  2. Bandeau de confiance                                            */
/* ------------------------------------------------------------------ */

const TRUST = [
    ['Conçu au Cameroun', 'Pour les réseaux de vente d’Afrique francophone'],
    ['Fonctionne hors ligne', 'Envoi automatique au retour du réseau'],
    ['Téléphones d’entrée de gamme', 'Application légère, installable'],
    ['Mobile Money', 'Abonnement payable par Mobile Money ou carte'],
];

export function TrustStrip() {
    return (
        <section className="border-y border-slate-900 bg-white">
            <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
                {TRUST.map(([t, s], i) => (
                    <div
                        key={t}
                        className={`px-5 py-6 sm:px-8 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''} border-slate-200`}
                    >
                        <p className="text-sm font-bold text-slate-900 sm:text-base">
                            {t}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            {s}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  3. Sans Motriks / Avec Motriks                                     */
/* ------------------------------------------------------------------ */

const COMPARE: [string, string, string][] = [
    [
        'Présence',
        'Des appels pour savoir qui est en poste',
        'Pointage avec l’heure et le lieu',
    ],
    [
        'Ventes',
        'Des chiffres sur WhatsApp, le soir',
        'Rapport produit par produit, depuis le magasin',
    ],
    [
        'Stock',
        'La rupture se voit quand le rayon est vide',
        'Alerte avant qu’un produit manque',
    ],
    ['Réseau', 'La saisie se perd sans connexion', 'Tout continue hors ligne'],
    [
        'Bureau',
        'Tout est ressaisi dans Excel',
        'Ventes prêtes à exporter en Excel',
    ],
];

export function Compare() {
    return (
        <section className="py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <Kicker>Sans Motriks · Avec Motriks</Kicker>
                    <Title className="mt-5">
                        Le même terrain.{' '}
                        <span className="text-green-700">Deux façons</span> de
                        le gérer.
                    </Title>
                </div>

                <div
                    className="mt-12 grid border-t-2 border-slate-900 lg:grid-cols-2"
                    data-reveal
                >
                    <div className="bg-[#F5F6F4] p-6 sm:p-8">
                        <p className="text-sm font-extrabold tracking-[0.2em] text-slate-500 uppercase">
                            Sans Motriks
                        </p>
                        <div className="mt-5 aspect-[16/7] overflow-hidden">
                            <img
                                src={`${IMG}/cahier-rapport.webp`}
                                alt="Rapport tenu à la main dans un cahier"
                                width={1200}
                                height={675}
                                loading="lazy"
                                className="h-full w-full object-cover grayscale-[30%]"
                            />
                        </div>
                        <ul className="mt-2">
                            {COMPARE.map(([k, no]) => (
                                <li
                                    key={k}
                                    className="grid grid-cols-[28px_1fr] border-b border-slate-200 py-4"
                                >
                                    <span
                                        className="font-extrabold text-red-700"
                                        aria-hidden="true"
                                    >
                                        ✕
                                    </span>
                                    <span>
                                        <span className="block text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">
                                            {k}
                                        </span>
                                        <span className="text-base text-slate-600 sm:text-lg">
                                            {no}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="border-slate-200 p-6 sm:p-8 lg:border-l">
                        <p className="text-sm font-extrabold tracking-[0.2em] text-green-700 uppercase">
                            Avec Motriks
                        </p>
                        <div className="mt-5 aspect-[16/7] overflow-hidden border border-slate-200">
                            <img
                                src={`${IMG}/desktop-rapport-detail.webp`}
                                alt="Rapport reçu par le gérant dans Motriks"
                                width={1600}
                                height={1000}
                                loading="lazy"
                                className="h-full w-full object-cover object-[0_15%]"
                            />
                        </div>
                        <ul className="mt-2">
                            {COMPARE.map(([k, , yes]) => (
                                <li
                                    key={k}
                                    className="grid grid-cols-[28px_1fr] border-b border-slate-200 py-4"
                                >
                                    <span
                                        className="font-extrabold text-green-700"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                    <span>
                                        <span className="block text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">
                                            {k}
                                        </span>
                                        <span className="text-base font-semibold text-slate-900 sm:text-lg">
                                            {yes}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  4. Comment ça marche                                               */
/* ------------------------------------------------------------------ */

const STEPS_V2 = [
    {
        n: '01',
        t: 'Pointer',
        d: 'L’hôtesse prend son service depuis son téléphone, sur le point de vente. L’heure et le lieu sont enregistrés.',
        img: 'mobile-accueil',
        alt: 'Accueil de l’hôtesse avec le bouton « Prendre mon service »',
    },
    {
        n: '02',
        t: 'Déclarer',
        d: 'Elle saisit ses ventes produit par produit, son stock et ses photos dans le rapport du jour, même sans réseau.',
        img: 'mobile-rapport',
        alt: 'Rapport du jour avec les ventes par produit',
    },
    {
        n: '03',
        t: 'Suivre',
        d: 'Vous voyez l’activité, les ventes et les alertes de stock de chaque point de vente, au fil de la journée.',
        img: 'mobile-stock',
        alt: 'Stock du point de vente avec une alerte de produit presque épuisé',
    },
];

export function HowItWorks() {
    return (
        <section
            id="comment-ca-marche"
            className="scroll-mt-24 bg-[#F5F6F4] py-20 lg:py-28"
            style={GRID_BG}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <Kicker>Comment ça marche</Kicker>
                    <Title className="mt-5">
                        Pointer, déclarer,{' '}
                        <span className="text-green-700">suivre.</span>
                    </Title>
                </div>
                <div className="mt-12 grid gap-10 border-t-2 border-slate-900 pt-10 md:grid-cols-3 md:gap-8">
                    {STEPS_V2.map((s) => (
                        <div key={s.n} data-reveal>
                            <p className="text-5xl font-extrabold tracking-tight text-green-700">
                                {s.n}
                            </p>
                            <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
                                {s.t}
                            </h3>
                            <p className="mt-2 text-base leading-relaxed text-slate-600">
                                {s.d}
                            </p>
                            <Phone
                                src={s.img}
                                alt={s.alt}
                                className="mt-6 h-[420px] w-full max-w-[260px]"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  5. Fonctionnalités (onglets)                                       */
/* ------------------------------------------------------------------ */

const FEATURE_TABS = [
    {
        key: 'presences',
        label: 'Présences',
        title: 'Sachez qui est en poste, et depuis quand.',
        points: [
            'Prise de service depuis le téléphone',
            'Heure d’arrivée et de départ enregistrées',
            'Distance au point de vente au moment du pointage',
        ],
        img: 'desktop-rapport-detail',
        alt: 'Rapport du jour vu par le gérant, avec l’heure d’arrivée et le lieu du pointage',
    },
    {
        key: 'ventes',
        label: 'Ventes',
        title: 'Les ventes du jour, produit par produit.',
        points: [
            'Rapport envoyé depuis le magasin',
            'Chiffre d’affaires par jour, par site et par hôtesse',
            'Comparaison avec la période précédente',
        ],
        img: 'desktop-ventes-objectifs',
        alt: 'Écran Ventes & objectifs avec le chiffre d’affaires du mois',
    },
    {
        key: 'stocks',
        label: 'Stocks',
        title: 'La rupture, avant que le rayon soit vide.',
        points: [
            'Stock de chaque point de vente, mis à jour à chaque rapport',
            'Alerte quand un produit va manquer',
            'Écarts de stock expliqués par l’hôtesse',
        ],
        img: 'mobile-stock',
        alt: 'Stock du point de vente avec une alerte',
        phone: true,
    },
    {
        key: 'objectifs',
        label: 'Objectifs',
        title: 'Des objectifs suivis, une base claire pour vos primes.',
        points: [
            'Objectifs du mois et de la semaine, par hôtesse et par site',
            'Réalisation de l’équipe et projection de fin de mois',
            'Qui est en bonne voie, qui est en retard',
        ],
        img: 'desktop-objectifs',
        alt: 'Suivi des objectifs : 85 % de réalisation, en bonne voie',
    },
    {
        key: 'hors-ligne',
        label: 'Hors ligne',
        title: 'Pas de réseau ? Le travail continue.',
        points: [
            'Pointage, rapport et photos gardés sur le téléphone',
            'Envoi automatique au retour du réseau',
            'L’heure réelle du pointage est conservée',
        ],
        img: 'offline-2-service',
        alt: 'Prise de service sans réseau : envoi automatique au retour du réseau',
        phone: true,
    },
    {
        key: 'exports',
        label: 'Exports',
        title: 'Prêt pour la comptabilité.',
        points: [
            'Export Excel des ventes',
            'Synthèses PDF à vos couleurs',
            'Accès en consultation pour votre comptable',
        ],
        img: 'desktop-ventes-objectifs',
        alt: 'Boutons « Synthèse PDF » et « Exporter en Excel »',
    },
];

export function Features() {
    const [active, setActive] = useState(FEATURE_TABS[0].key);
    const tab = FEATURE_TABS.find((t) => t.key === active) ?? FEATURE_TABS[0];

    return (
        <section id="fonctionnalites" className="scroll-mt-24 py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <Kicker>Fonctionnalités</Kicker>
                    <Title className="mt-5">
                        Tout votre terrain,{' '}
                        <span className="text-green-700">
                            dans une seule application.
                        </span>
                    </Title>
                </div>

                <div
                    className="mt-10 flex gap-0 overflow-x-auto border-b border-slate-200"
                    role="tablist"
                    aria-label="Fonctionnalités"
                >
                    {FEATURE_TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={t.key === active}
                            onClick={() => setActive(t.key)}
                            className={`-mb-px shrink-0 border-b-2 px-5 py-3.5 text-sm font-bold whitespace-nowrap transition sm:text-base ${
                                t.key === active
                                    ? 'border-green-700 text-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div
                    key={tab.key}
                    className="lp-fade mt-10 grid items-center gap-10 lg:grid-cols-12"
                    role="tabpanel"
                >
                    <div className="lg:col-span-5">
                        <h3 className="text-2xl leading-tight font-extrabold text-slate-900 sm:text-3xl">
                            {tab.title}
                        </h3>
                        <ul className="mt-6 border-t border-slate-200">
                            {tab.points.map((p, i) => (
                                <li
                                    key={p}
                                    className="grid grid-cols-[48px_1fr] border-b border-slate-200 py-4 text-base font-semibold text-slate-800 sm:text-lg"
                                >
                                    <span className="font-extrabold text-green-700">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="lg:col-span-7">
                        {tab.phone ? (
                            <div
                                className="flex justify-center bg-[#F5F6F4] py-8"
                                style={GRID_BG}
                            >
                                <Phone
                                    src={tab.img}
                                    alt={tab.alt}
                                    className="h-[480px] w-[230px]"
                                />
                            </div>
                        ) : (
                            <Browser src={tab.img} alt={tab.alt} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  6. Côté gérant                                                     */
/* ------------------------------------------------------------------ */

export function ManagerSection() {
    return (
        <section className="bg-[#F5F6F4] py-20 lg:py-28">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
                <div className="lg:col-span-5" data-reveal>
                    <div className="aspect-[4/5] overflow-hidden">
                        <img
                            src={`${IMG}/entrepreneur-telephone.webp`}
                            alt="Un responsable suit son activité au téléphone"
                            width={1400}
                            height={788}
                            loading="lazy"
                            className="h-full w-full object-cover object-[64%_50%]"
                        />
                    </div>
                </div>
                <div className="lg:col-span-7">
                    <Kicker>Côté gérant</Kicker>
                    <Title className="mt-5">
                        Votre chiffre d’affaires,{' '}
                        <span className="text-green-700">
                            point de vente par point de vente.
                        </span>
                    </Title>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                        Plus besoin d’attendre la fin du mois ni de relancer
                        chaque hôtesse : les chiffres remontent au fil de la
                        journée.
                    </p>
                    <div className="mt-8 grid grid-cols-1 border-t-2 border-slate-900 sm:grid-cols-3">
                        {[
                            [
                                'Par jour',
                                'Ventes de la journée, rapport par rapport',
                            ],
                            [
                                'Par site',
                                'Chaque point de vente, ses ventes, son stock',
                            ],
                            ['Par hôtesse', 'Objectifs, réalisation, présence'],
                        ].map(([t, d], i) => (
                            <div
                                key={t}
                                className={`py-5 sm:px-5 ${i ? 'border-t border-slate-200 sm:border-t-0 sm:border-l' : 'sm:pl-0'}`}
                            >
                                <p className="text-lg font-extrabold text-slate-900">
                                    {t}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                    {d}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  7. Pour qui                                                        */
/* ------------------------------------------------------------------ */

const AUDIENCES = [
    {
        t: 'Agences d’hôtesses et d’animation',
        d: 'Plannings, présences et rapports de chaque mission, chez chaque client.',
        img: 'supermarche-allee',
        pos: '50% 35%',
        alt: 'Cliente avec un chariot dans une allée de supermarché',
    },
    {
        t: 'Marques et distributeurs',
        d: 'Ventes et stock de vos produits dans chaque magasin, sans attendre le fournisseur.',
        img: 'supermarche-rayon',
        pos: '20% 50%',
        alt: 'Rayon de produits dans un supermarché',
    },
    {
        t: 'Réseaux de points de vente',
        d: 'Boutiques, supérettes, kiosques : chaque vendeuse déclare sa journée.',
        img: 'vendeuse-comptoir',
        pos: '50% 40%',
        alt: 'Vendeuse derrière le comptoir de sa boutique',
    },
];

export function Audiences() {
    return (
        <section id="pour-qui" className="scroll-mt-24 py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <Kicker>Pour qui</Kicker>
                    <Title className="mt-5">
                        Pensé pour les équipes{' '}
                        <span className="text-green-700">
                            en point de vente.
                        </span>
                    </Title>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-3">
                    {AUDIENCES.map((a) => (
                        <article
                            key={a.t}
                            data-reveal
                            className="group border-t-2 border-slate-900"
                        >
                            <div className="mt-6 aspect-[4/3] overflow-hidden">
                                <img
                                    src={`${IMG}/${a.img}.webp`}
                                    alt={a.alt}
                                    width={1600}
                                    height={1067}
                                    loading="lazy"
                                    style={{ objectPosition: a.pos }}
                                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                                />
                            </div>
                            <h3 className="mt-5 text-xl font-extrabold text-slate-900">
                                {a.t}
                            </h3>
                            <p className="mt-2 text-base leading-relaxed text-slate-600">
                                {a.d}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  9. Appel à l'action final                                          */
/* ------------------------------------------------------------------ */

export function FinalCtaV2() {
    return (
        <section
            id="contact"
            className="scroll-mt-24 border-t-2 border-slate-900 py-20 lg:py-28"
            style={GRID_BG}
        >
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
                <div className="lg:col-span-7">
                    <img
                        src="/images/logos/motriks-logo.svg"
                        alt="Motriks"
                        width={1212}
                        height={186}
                        className="h-12 w-auto sm:h-14"
                    />
                    <h2 className="mt-8 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
                        Testez Motriks{' '}
                        <span className="text-green-700">
                            avec votre équipe.
                        </span>
                    </h2>
                    <div className="mt-8 flex items-baseline gap-5 border-y border-slate-200 py-6">
                        <span className="text-6xl font-extrabold tracking-tight text-green-700 sm:text-7xl">
                            1 mois
                        </span>
                        <span className="text-base font-semibold text-slate-600 sm:text-lg">
                            offert sur le forfait Business,
                            <br />
                            sans carte bancaire.
                        </span>
                    </div>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href="/register" className={INK_BUTTON}>
                            Créer mon compte <Arrow />
                        </Link>
                        <Link href="/contact" className={LINE_BUTTON}>
                            Parler à notre équipe
                        </Link>
                    </div>
                </div>
                <ol className="border-t-2 border-slate-900 lg:col-span-5">
                    {[
                        'Créez votre compte',
                        'Ajoutez vos hôtesses et vos points de vente, ou importez votre fichier Excel',
                        'Recevez le premier rapport le jour même',
                    ].map((s, i) => (
                        <li
                            key={s}
                            className="grid grid-cols-[56px_1fr] border-b border-slate-200 py-5 text-lg font-semibold text-slate-900"
                        >
                            <span className="font-extrabold text-green-700">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            {s}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** Animations propres à la page (flottement léger, fondu des onglets), coupées si l'utilisateur les refuse. */
export const LANDING_CSS = `
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.lp-float{animation:lp-float 6s ease-in-out infinite}
@keyframes lp-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.lp-fade{animation:lp-fade .45s cubic-bezier(.22,1,.36,1)}
@media (prefers-reduced-motion:reduce){.lp-float,.lp-fade{animation:none}}
`;
