/* ------------------------------------------------------------------ */
/*  Contenu modifiable (coordonnées : resources/js/lib/contact.ts)     */
/* ------------------------------------------------------------------ */

export const NAV_LINKS = [
    { label: 'Fonctionnalités', href: '#fonctionnalites' },
    { label: 'Intelligence artificielle', href: '#ia' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'FAQ', href: '#faq' },
];

export const STATS = [
    { value: '< 2 min', label: "pour saisir l'activité du jour" },
    { value: '0', label: 'calcul manuel à faire' },
    { value: "Jusqu'à 5 h", label: 'de reporting en moins par semaine' },
    { value: 'Hors-ligne', label: 'saisie possible sans réseau' },
];

export const PROBLEMS = [
    'Reporting par messages WhatsApp, erreurs et oublis',
    'Calculs faits à la main, stocks et ventes qui ne collent pas',
    'Compilation hebdomadaire de plusieurs heures',
    'Aucune visibilité en direct, ruptures découvertes trop tard',
    'Présences suivies de façon informelle, litiges fréquents',
];

export const SOLUTIONS = [
    'Saisie structurée et contrôlée sur mobile',
    'Totaux, montants et soldes calculés automatiquement',
    'Rapports consolidés et exportés en un clic',
    'Tableau de bord et alertes en temps réel',
    "Pointage, historique et justificatifs d'absence",
];

export const FEATURES = [
    {
        icon: 'field',
        title: 'Suivi terrain',
        text: 'Prise de service, saisie rapide avec contrôles de cohérence, clôture journalière et mode hors-ligne.',
    },
    {
        icon: 'clock',
        title: 'Présences et pointage',
        text: 'Plannings par site, échanges de poste, retards et absences enregistrés automatiquement.',
    },
    {
        icon: 'box',
        title: 'Stocks et réassorts',
        text: "Stock d'ouverture repris de la veille, seuils critiques, bons de commande PDF en un clic.",
    },
    {
        icon: 'file',
        title: 'Rapports et documents',
        text: 'Exports PDF et Excel aux couleurs de votre entreprise, attestations et relevés générés instantanément.',
    },
    {
        icon: 'coin',
        title: 'Primes et commissions',
        text: 'Barèmes paramétrables, calcul automatique des primes, fiche de rémunération par hôtesse.',
    },
    {
        icon: 'bell',
        title: 'Alertes configurables',
        text: 'Seuils par site, notifications prioritaires par application, e-mail, SMS ou WhatsApp.',
    },
    {
        icon: 'camera',
        title: 'Preuves terrain',
        text: 'Photos du stand horodatées et géolocalisées, liste de contrôle de présentation.',
    },
    {
        icon: 'chat',
        title: 'Communication',
        text: "Annonces à toute l'équipe, rappels automatiques et messagerie interne, fini les groupes WhatsApp.",
    },
];

export const AI_FEATURES = [
    {
        icon: 'spark',
        title: 'Synthèse automatique',
        text: 'Le résumé de votre semaine ou de votre mois, rédigé en langage clair, prêt à lire.',
    },
    {
        icon: 'alert',
        title: "Détection d'anomalies",
        text: 'Ventes anormales, absences répétées, incohérences : vous êtes prévenu avant la perte.',
    },
    {
        icon: 'trend',
        title: 'Prévisions',
        text: 'Anticipez les ventes, les besoins en personnel et les risques de rupture.',
    },
    {
        icon: 'chat',
        title: 'Assistant conversationnel',
        text: 'Posez une question comme « quel site a le mieux vendu ce mois-ci ? » et obtenez la réponse chiffrée.',
    },
];

export const STEPS = [
    {
        icon: 'grid',
        tag: 'Quelques minutes',
        title: 'Créez votre espace',
        text: 'Ajoutez votre logo, vos couleurs, vos sites et votre équipe en quelques minutes.',
    },
    {
        icon: 'file',
        tag: 'Sans ressaisie',
        title: 'Importez votre Excel',
        text: 'Reprenez votre personnel, vos sites et vos produits existants sans tout ressaisir.',
    },
    {
        icon: 'trend',
        tag: 'En temps réel',
        title: 'Pilotez en direct',
        text: 'Vos équipes saisissent depuis leur téléphone, vous suivez tout en temps réel.',
    },
];

export const PERSONAS = [
    {
        title: 'Gérant de PME',
        text: "Voyez la performance de votre entreprise en un coup d'œil, sans rien compiler.",
    },
    {
        title: 'Responsable commercial',
        text: "Suivez l'avancement du jour sur tous vos sites et anticipez les ruptures.",
    },
    {
        title: "Agence d'hôtesses",
        text: 'Gérez plannings, présences et facturation par client, avec portail client en marque blanche.',
    },
    {
        title: 'Comptable',
        text: 'Recevez des exports fiables, prêts pour la paie et la comptabilité, sans ressaisie.',
    },
];

export const LOCAL = [
    {
        icon: 'offline',
        title: 'Mode hors-ligne',
        text: 'Les saisies sont conservées et synchronisées dès le retour du réseau.',
    },
    {
        icon: 'signal',
        title: 'Économie de données',
        text: 'Interface légère, pensée pour les connexions faibles et les forfaits limités.',
    },
    {
        icon: 'wallet',
        title: 'Mobile Money',
        text: 'Payez votre abonnement par Mobile Money ou carte bancaire.',
    },
    {
        icon: 'install',
        title: 'Installable',
        text: 'Application web installable sur Android, iOS et ordinateur, sans passer par une boutique.',
    },
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
