/* ------------------------------------------------------------------ */
/*  Contenu modifiable (coordonnées : resources/js/lib/contact.ts)     */
/* ------------------------------------------------------------------ */

export const NAV_LINKS = [
    { label: 'Solutions', href: '#solutions' },
    { label: 'Plateforme', href: '#plateforme' },
    { label: 'Mise en service', href: '#mise-en-service' },
    { label: 'Sécurité', href: '#securite' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'FAQ', href: '#faq' },
];

/* Forfaits Motriks : mêmes prix et mêmes limites que l'application (App\Enums\Plan) */
export const PLANS = [
    {
        name: 'Motriks Starter',
        price: 'Gratuit',
        unit: '',
        description: 'Pour découvrir Motriks avec une hôtesse.',
        features: [
            '1 hôtesse et 1 point de vente',
            'Suivi terrain, même sans réseau',
            'Rapports journaliers et chiffres du jour',
            'Historique de 30 jours',
        ],
        cta: 'Commencer gratuitement',
        highlight: false,
    },
    {
        name: 'Motriks Pro',
        price: '14 500',
        unit: 'FCFA / mois',
        description: 'Pour la PME qui pilote son réseau de vente.',
        features: [
            '7 hôtesses, 7 points de vente et 2 superviseurs',
            'Stocks, rappels et notifications push',
            'Ventes et objectifs par hôtesse',
            'PDF à vos couleurs et exports Excel',
            '1 événement et 3 packs par mois',
        ],
        cta: 'Essayer 1 mois gratuit',
        highlight: false,
    },
    {
        name: 'Motriks Business',
        price: '48 000',
        unit: 'FCFA / mois',
        description: 'Pour les agences et les marques en campagne.',
        features: [
            '35 hôtesses, 35 points de vente et 6 superviseurs',
            '3 événements et 10 packs par mois',
            '6 photos par rapport',
            'Historique illimité',
            'Mise en service offerte',
        ],
        cta: 'Essayer 1 mois gratuit',
        highlight: true,
    },
    {
        name: 'Motriks Entreprise',
        price: '88 000',
        unit: 'FCFA / mois',
        description: 'Pour les grands réseaux et les groupes.',
        features: [
            '120 hôtesses et 120 points de vente',
            'Superviseurs illimités',
            'Événements et packs illimités',
            'PDF et exports illimités',
            'Interlocuteur dédié',
        ],
        cta: 'Nous contacter',
        highlight: false,
    },
];

export const FAQS = [
    {
        q: 'Mes données sont-elles protégées ?',
        a: "Oui. Chaque entreprise dispose d'un espace totalement isolé, les flux sont chiffrés (HTTPS), les sauvegardes sont quotidiennes et un journal d'audit trace les actions sensibles.",
    },
    {
        q: "Mes hôtesses ont-elles besoin d'un smartphone récent ?",
        a: "Non. L'interface est légère et fonctionne sur un téléphone d'entrée de gamme, même avec un réseau instable grâce au mode hors-ligne.",
    },
    {
        q: 'Puis-je essayer avant de payer ?',
        a: 'Oui. Motriks Starter est gratuit et sans engagement, et toute nouvelle entreprise essaie Motriks Business pendant 1 mois, gratuitement et sans carte bancaire.',
    },
    {
        q: 'Que se passe-t-il si mon abonnement expire ?',
        a: 'Votre entreprise passe automatiquement en Motriks Starter, le forfait gratuit. Vos données sont conservées : vous retrouvez tout dès que vous reprenez un forfait.',
    },
    {
        q: 'Puis-je récupérer mes données ?',
        a: "Oui, à tout moment. Vous pouvez exporter l'ensemble de vos données depuis la plateforme.",
    },
    {
        q: 'Puis-je importer mes fichiers Excel ?',
        a: "Oui. L'import reprend votre personnel, vos sites et vos produits pour démarrer en quelques minutes.",
    },
];
