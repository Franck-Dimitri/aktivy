import { Link } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { HeroDashboard } from '@/components/landing/hero-dashboard';

/*
 * Page d'accueil « entreprise » : pleine largeur, fonds francs (blanc ou sombre), images à angles
 * légers, apparitions au défilement (data-reveal, use-scroll-reveal.ts) et dévoilement des images.
 * Photos : public/images/landing (Unsplash) · captures : entreprise vitrine aux données fictives.
 */

const IMG = '/images/landing';

/** Conteneur large : le contenu occupe la place, marges latérales réduites. */
export const WRAP = 'mx-auto w-full max-w-[1520px] px-5 sm:px-8 lg:px-12';

/** Animations propres à la page, en plus de REVEAL_CSS (fondu et montée des blocs). */
export const ENTERPRISE_CSS = `
.lp-wipe{clip-path:inset(0 0 0 0)}
.rv.lp-wipe{clip-path:inset(0 100% 0 0);transition:clip-path 1.1s cubic-bezier(.77,0,.18,1),opacity .6s ease,transform .8s cubic-bezier(.22,1,.36,1)}
.rv.rv-in.lp-wipe{clip-path:inset(0 0 0 0)}
.lp-zoom img{transition:transform 1.2s cubic-bezier(.22,1,.36,1)}
.lp-zoom:hover img{transform:scale(1.05)}
.rv .lp-line{transform:scaleX(0);transform-origin:left;transition:transform 1.2s cubic-bezier(.22,1,.36,1) .2s}
.rv.rv-in .lp-line{transform:scaleX(1)}
@keyframes lp-fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.lp-fade{animation:lp-fade .5s cubic-bezier(.22,1,.36,1)}
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.lp-float{animation:lp-float 7s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.rv.lp-wipe{clip-path:none}.lp-fade,.lp-float{animation:none}.rv .lp-line{transform:none}}
`;

function Arrow() {
    return (
        <svg
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

/** Sur-titre de section : texte en capitales espacées, comme mi-tech. */
function Overline({
    children,
    light = false,
}: {
    children: ReactNode;
    light?: boolean;
}) {
    return (
        <p
            className={`text-xs font-bold tracking-[0.22em] uppercase sm:text-[13px] ${light ? 'text-green-400' : 'text-green-700'}`}
        >
            {children}
        </p>
    );
}

function Heading({
    children,
    light = false,
    className = '',
}: {
    children: ReactNode;
    light?: boolean;
    className?: string;
}) {
    return (
        <h2
            className={`text-[34px] leading-[1.06] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[56px] ${light ? 'text-white' : 'text-slate-950'} ${className}`}
        >
            {children}
        </h2>
    );
}

/* ------------------------------------------------------------------ */
/*  1. Haut de page : texte à gauche, tableau de bord incliné à droite */
/* ------------------------------------------------------------------ */

export function EnterpriseHero() {
    return (
        <section className="relative overflow-hidden bg-white pt-28 pb-16 lg:pt-36 lg:pb-28">
            <div
                className={`${WRAP} grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}
            >
                <div>
                    <div data-reveal>
                        <Overline>
                            Plateforme B2B · Afrique francophone
                        </Overline>
                    </div>
                    <h1
                        data-reveal
                        className="mt-6 text-[44px] leading-[1.02] font-extrabold tracking-tight text-balance text-slate-950 sm:text-6xl xl:text-[76px]"
                    >
                        Pilotez vos équipes{' '}
                        <span className="text-green-700">
                            en point de vente.
                        </span>
                    </h1>
                    <p
                        data-reveal
                        className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl"
                    >
                        Présences, ventes, stocks et objectifs de chaque hôtesse
                        et de chaque magasin, réunis dans un seul outil. Même
                        sans réseau.
                    </p>
                    <div
                        data-reveal
                        className="mt-10 flex flex-col gap-3 sm:flex-row"
                    >
                        <Link
                            href="/register"
                            className="group inline-flex items-center justify-center gap-3 rounded-full bg-green-700 px-8 py-4 text-base font-semibold text-white transition hover:bg-green-800"
                        >
                            Essayer 1 mois gratuit <Arrow />
                        </Link>
                        <a
                            href="#plateforme"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-8 py-4 text-base font-semibold text-slate-900 transition hover:border-slate-900"
                        >
                            Voir la plateforme
                        </a>
                    </div>
                    <p data-reveal className="mt-6 text-sm text-slate-500">
                        Forfait Business offert pendant 1 mois · sans carte
                        bancaire · sans engagement
                    </p>
                </div>

                {/* Même emplacement qu'avant : la fenêtre inclinée déborde à droite de l'écran */}
                <div data-reveal className="relative lg:-mr-[22vw]">
                    <div className="hero-tilt w-full lg:w-[980px]">
                        <HeroDashboard />
                    </div>
                    <div className="lp-float relative mt-6 overflow-hidden rounded-lg shadow-2xl ring-4 shadow-slate-900/25 ring-white sm:mx-auto sm:w-3/4 lg:absolute lg:-bottom-14 lg:-left-12 lg:mt-0 lg:w-[300px]">
                        <img
                            src={`${IMG}/supermarche-rayon.webp`}
                            alt="Deux clientes choisissent des produits dans le rayon d’un supermarché"
                            width={1600}
                            height={1067}
                            className="aspect-[4/3] w-full object-cover object-[30%_50%]"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  2. Bandeau de faits (fond sombre plein)                            */
/* ------------------------------------------------------------------ */

const FACTS = [
    [
        'Hors ligne',
        'Pointage et rapports sans réseau, envoi automatique au retour',
    ],
    ['4 rôles', 'Gérant, superviseur, hôtesse et comptable, chacun son espace'],
    ['Mobile Money', 'Abonnement payable par Mobile Money ou carte bancaire'],
    [
        'Données protégées',
        'Espace isolé, sauvegardes quotidiennes, export à tout moment',
    ],
];

export function FactsBand() {
    return (
        <section className="bg-slate-950 text-white">
            <div
                className={`${WRAP} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}
            >
                {FACTS.map(([t, d], i) => (
                    <div
                        key={t}
                        data-reveal
                        className={`py-9 sm:px-6 ${i ? 'border-t border-white/10 sm:border-t-0' : ''} ${i % 2 ? 'sm:border-l sm:border-white/10' : ''} ${i === 2 ? 'lg:border-l lg:border-white/10' : ''} lg:first:pl-0`}
                    >
                        <p className="text-2xl font-extrabold text-green-400">
                            {t}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {d}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  3. Solutions par métier (01 à 03)                                  */
/* ------------------------------------------------------------------ */

const SOLUTIONS = [
    {
        n: '01',
        t: 'Agences d’hôtesses et d’animation',
        d: 'Plannings, présences et rapports de chaque mission, client par client.',
        pts: [
            'Affectations par magasin et par créneau',
            'Preuve de présence sur place',
            'Rapport de mission en PDF',
        ],
        img: 'supermarche-allee',
        pos: '50% 35%',
        alt: 'Cliente avec un chariot dans une allée de supermarché',
    },
    {
        n: '02',
        t: 'Marques et distributeurs',
        d: 'Ventes et stock de vos produits dans chaque magasin, sans attendre le point du distributeur.',
        pts: [
            'Ventes par produit et par magasin',
            'Alertes avant la rupture',
            'Objectifs par animatrice',
        ],
        img: 'telephone-femme',
        pos: '50% 25%',
        alt: 'Une responsable commerciale au téléphone',
    },
    {
        n: '03',
        t: 'Réseaux de boutiques',
        d: 'Boutiques, supérettes, kiosques : chaque vendeuse déclare sa journée depuis son téléphone.',
        pts: [
            'Chiffre d’affaires par point de vente',
            'Stock de chaque boutique',
            'Export Excel pour la comptabilité',
        ],
        img: 'vendeuse-comptoir',
        pos: '50% 40%',
        alt: 'Vendeuse derrière le comptoir de sa boutique',
    },
];

export function Solutions() {
    return (
        <section
            id="solutions"
            className="scroll-mt-24 bg-white py-24 lg:py-32"
        >
            <div className={WRAP}>
                <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
                    <div data-reveal className="lg:col-span-7">
                        <Overline>Solutions</Overline>
                        <Heading className="mt-4">
                            Un réseau de vente.{' '}
                            <span className="text-green-700">
                                Une solution.
                            </span>
                        </Heading>
                    </div>
                    <p
                        data-reveal
                        className="text-lg leading-relaxed text-slate-600 lg:col-span-5"
                    >
                        Agence, marque ou réseau de boutiques : Motriks s’adapte
                        à votre façon de travailler sur le terrain.
                    </p>
                </div>
                <div className="mt-16 grid gap-10 md:grid-cols-3 lg:gap-8">
                    {SOLUTIONS.map((s) => (
                        <a
                            key={s.n}
                            href="/register"
                            data-reveal
                            className="group block"
                        >
                            <div
                                data-reveal
                                className="lp-wipe lp-zoom overflow-hidden rounded-md"
                            >
                                <img
                                    src={`${IMG}/${s.img}.webp`}
                                    alt={s.alt}
                                    width={1600}
                                    height={1067}
                                    loading="lazy"
                                    style={{ objectPosition: s.pos }}
                                    className="aspect-[4/3] w-full object-cover"
                                />
                            </div>
                            <div className="mt-7 flex items-baseline gap-4 border-t-2 border-slate-950 pt-5">
                                <span className="text-sm font-extrabold text-green-700">
                                    {s.n}
                                </span>
                                <h3 className="text-2xl font-bold text-slate-950 transition group-hover:text-green-700">
                                    {s.t}
                                </h3>
                            </div>
                            <p className="mt-3 text-base leading-relaxed text-slate-600">
                                {s.d}
                            </p>
                            <ul className="mt-5 space-y-2.5">
                                {s.pts.map((p) => (
                                    <li
                                        key={p}
                                        className="flex gap-3 text-[15px] font-semibold text-slate-800"
                                    >
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-green-600" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  4. La plateforme : un espace par rôle (onglets)                    */
/* ------------------------------------------------------------------ */

const ROLES = [
    {
        key: 'gerant',
        label: 'Gérant',
        title: 'Tout le réseau sur un seul écran.',
        pts: [
            'Chiffre d’affaires du jour et de la semaine',
            'Hôtesses en poste, points de vente actifs',
            'Alertes de stock et objectifs',
        ],
        img: 'tableau-de-bord',
        alt: 'Tableau de bord du gérant',
        phone: false,
    },
    {
        key: 'hotesse',
        label: 'Hôtesse',
        title: 'Sa journée, sur son téléphone.',
        pts: [
            'Prise de service sur le point de vente',
            'Ventes, stock et photos dans le rapport du jour',
            'Fonctionne même sans réseau',
        ],
        img: 'mobile-rapport',
        alt: 'Rapport du jour de l’hôtesse sur téléphone',
        phone: true,
    },
    {
        key: 'stock',
        label: 'Superviseur',
        title: 'Le stock de chaque magasin, à jour.',
        pts: [
            'Stock mis à jour à chaque rapport',
            'Alerte quand un produit va manquer',
            'Validation des rapports de l’équipe',
        ],
        img: 'mobile-stock',
        alt: 'Stock d’un point de vente sur téléphone',
        phone: true,
    },
    {
        key: 'comptable',
        label: 'Comptable',
        title: 'Les chiffres, prêts pour la comptabilité.',
        pts: [
            'Ventes par jour, par site et par hôtesse',
            'Export Excel et synthèse PDF',
            'Accès en consultation seule',
        ],
        img: 'desktop-ventes-objectifs',
        alt: 'Écran Ventes et objectifs avec export Excel',
        phone: false,
    },
];

export function Platform() {
    const [active, setActive] = useState(ROLES[0].key);
    const role = ROLES.find((r) => r.key === active) ?? ROLES[0];

    return (
        <section
            id="plateforme"
            className="scroll-mt-24 bg-slate-950 py-24 text-white lg:py-32"
        >
            <div className={WRAP}>
                <div data-reveal className="max-w-3xl">
                    <Overline light>La plateforme</Overline>
                    <Heading light className="mt-4">
                        Un espace pour chaque personne{' '}
                        <span className="text-green-400">de votre équipe.</span>
                    </Heading>
                </div>

                <div
                    data-reveal
                    className="mt-12 flex gap-2 overflow-x-auto"
                    role="tablist"
                    aria-label="Espaces de la plateforme"
                >
                    {ROLES.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            role="tab"
                            aria-selected={r.key === active}
                            onClick={() => setActive(r.key)}
                            className={`shrink-0 rounded-full px-6 py-3 text-sm font-semibold transition ${r.key === active ? 'bg-green-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                <div
                    key={role.key}
                    className="lp-fade mt-12 grid items-center gap-12 lg:grid-cols-12"
                    role="tabpanel"
                >
                    <div className="lg:col-span-4">
                        <h3 className="text-3xl leading-tight font-extrabold">
                            {role.title}
                        </h3>
                        <ol className="mt-8 border-t border-white/15">
                            {role.pts.map((p, i) => (
                                <li
                                    key={p}
                                    className="grid grid-cols-[48px_1fr] border-b border-white/15 py-5 text-lg font-semibold text-slate-100"
                                >
                                    <span className="font-extrabold text-green-400">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    {p}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="lg:col-span-8">
                        {role.phone ? (
                            <div className="relative overflow-hidden rounded-md">
                                <img
                                    src={`${IMG}/gerant-telephone.webp`}
                                    alt=""
                                    width={1800}
                                    height={1013}
                                    loading="lazy"
                                    className="aspect-[16/9] w-full object-cover object-[35%_40%] opacity-60"
                                />
                                <img
                                    src={`${IMG}/${role.img}.webp`}
                                    alt={role.alt}
                                    width={600}
                                    height={1298}
                                    loading="lazy"
                                    className="absolute top-1/2 left-1/2 h-[88%] w-auto -translate-x-1/2 -translate-y-1/2 rounded-md shadow-2xl shadow-black/50"
                                />
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-md border border-white/10 shadow-2xl shadow-black/40">
                                <img
                                    src={`${IMG}/${role.img}.webp`}
                                    alt={role.alt}
                                    width={1840}
                                    height={1150}
                                    loading="lazy"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  5. Mise en service                                                 */
/* ------------------------------------------------------------------ */

const ONBOARDING = [
    [
        'Cadrage',
        'Vos points de vente, vos produits, vos équipes et vos objectifs.',
    ],
    [
        'Import de vos fichiers',
        'Personnel, sites et produits repris depuis Excel, sans ressaisie.',
    ],
    [
        'Prise en main des hôtesses',
        'Connexion par téléphone, première prise de service, premier rapport.',
    ],
    ['Suivi', 'Support par WhatsApp et centre d’aide dans l’application.'],
];

export function Onboarding() {
    return (
        <section
            id="mise-en-service"
            className="scroll-mt-24 bg-white py-24 lg:py-32"
        >
            <div className={WRAP}>
                <div className="grid gap-12 lg:grid-cols-12">
                    <div data-reveal className="lg:col-span-4">
                        <Overline>Mise en service</Overline>
                        <Heading className="mt-4">
                            Opérationnel en quelques jours,{' '}
                            <span className="text-green-700">accompagné.</span>
                        </Heading>
                        <p className="mt-6 text-lg leading-relaxed text-slate-600">
                            Notre équipe vous accompagne du premier fichier au
                            premier rapport.
                        </p>
                        <div className="lp-zoom mt-10 overflow-hidden rounded-md">
                            <img
                                src={`${IMG}/gerant-telephone.webp`}
                                alt="Un gérant suit son réseau depuis son téléphone"
                                width={1800}
                                height={1013}
                                loading="lazy"
                                className="aspect-[4/3] w-full object-cover object-[35%_40%]"
                            />
                        </div>
                    </div>
                    <ol className="grid gap-px self-start overflow-hidden rounded-md bg-slate-200 sm:grid-cols-2 lg:col-span-8">
                        {ONBOARDING.map(([t, d], i) => (
                            <li
                                key={t}
                                data-reveal
                                className="bg-white p-8 lg:p-10"
                            >
                                <p className="text-5xl font-extrabold tracking-tight text-green-700">
                                    {String(i + 1).padStart(2, '0')}
                                </p>
                                <span className="lp-line mt-6 block h-0.5 w-16 bg-green-600" />
                                <p className="mt-6 text-xl font-bold text-slate-950">
                                    {t}
                                </p>
                                <p className="mt-2 text-base leading-relaxed text-slate-600">
                                    {d}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  6. Sécurité et données                                             */
/* ------------------------------------------------------------------ */

const SECURITY = [
    [
        'Espace isolé par entreprise',
        'Aucune autre entreprise ne voit vos données.',
    ],
    [
        'Double authentification',
        'Code à usage unique pour sécuriser les comptes.',
    ],
    ['Journal d’audit', 'Chaque action importante est tracée.'],
    [
        'Sauvegardes et export',
        'Sauvegarde chaque jour, export complet à tout moment.',
    ],
];

export function Security() {
    return (
        <section
            id="securite"
            className="scroll-mt-24 border-t border-slate-200 bg-white py-24 lg:py-32"
        >
            <div className={`${WRAP} grid items-center gap-14 lg:grid-cols-12`}>
                <div
                    data-reveal
                    className="lp-wipe overflow-hidden rounded-md lg:col-span-5"
                >
                    <img
                        src={`${IMG}/cahier-rapport.webp`}
                        alt="Rapport tenu à la main dans un cahier"
                        width={1200}
                        height={675}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                    />
                </div>
                <div className="lg:col-span-7">
                    <div data-reveal>
                        <Overline>Sécurité et données</Overline>
                        <Heading className="mt-4">
                            Vos données restent{' '}
                            <span className="text-green-700">les vôtres.</span>
                        </Heading>
                    </div>
                    <div className="mt-10 grid gap-x-12 sm:grid-cols-2">
                        {SECURITY.map(([t, d]) => (
                            <div
                                key={t}
                                data-reveal
                                className="border-t border-slate-200 py-6"
                            >
                                <p className="text-lg font-bold text-slate-950">
                                    {t}
                                </p>
                                <p className="mt-1.5 text-base text-slate-600">
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
/*  7. Bandeau final                                                   */
/* ------------------------------------------------------------------ */

export function ClosingCta() {
    return (
        <section id="contact" className="scroll-mt-24 bg-green-800 text-white">
            <div
                className={`${WRAP} grid items-center gap-12 py-20 lg:grid-cols-12 lg:py-28`}
            >
                <div data-reveal className="lg:col-span-7">
                    <Heading light>
                        Votre réseau de vente mérite{' '}
                        <span className="text-green-300">
                            mieux que WhatsApp.
                        </span>
                    </Heading>
                    <p className="mt-6 max-w-xl text-lg text-green-50/90">
                        Essayez Motriks Business gratuitement pendant 1 mois,
                        sans carte bancaire.
                    </p>
                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/register"
                            className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 font-semibold text-green-800 transition hover:bg-green-50"
                        >
                            Créer mon compte <Arrow />
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-4 font-semibold text-white transition hover:border-white"
                        >
                            Nous contacter
                        </Link>
                    </div>
                </div>
                <div
                    data-reveal
                    className="lp-wipe overflow-hidden rounded-md lg:col-span-5"
                >
                    <img
                        src={`${IMG}/supermarche-allee.webp`}
                        alt="Cliente avec un chariot dans une allée de supermarché"
                        width={1600}
                        height={1067}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover object-[50%_35%]"
                    />
                </div>
            </div>
        </section>
    );
}
