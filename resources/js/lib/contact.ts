/**
 * Coordonnées de Motriks affichées sur le site public (landing, pied de page, page Contact).
 * Une seule source : changer le numéro ici le change partout. Côté serveur (centre d'aide,
 * factures), le même numéro est la valeur par défaut de config/motriks.php.
 */
export const CONTACT = {
    email: 'contact@motriks.com',
    /** Format international sans « + » ni espaces, pour les liens wa.me et tel: */
    whatsapp: '237657439465',
    whatsappLabel: '+237 657 43 94 65',
    whatsappUrl: 'https://wa.me/237657439465',
    hours: 'Lundi - Samedi, 8h - 18h',
} as const;
