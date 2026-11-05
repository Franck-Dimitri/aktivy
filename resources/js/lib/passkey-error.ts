/**
 * Messages en français pour les erreurs de clé d'accès (@laravel/passkeys les renvoie en anglais).
 * Les classes d'erreur fixent `name` explicitement : on s'appuie dessus plutôt que sur le texte.
 */
export function passkeyErrorMessage(error: { name?: string; message?: string } | string | null | undefined): string | null {
    if (!error) return null;
    const name = typeof error === 'string' ? '' : (error.name ?? '');
    const message = typeof error === 'string' ? error : (error.message ?? '');

    switch (name) {
        case 'UserCancelledError':
            return 'Opération annulée ou délai dépassé. Réessayez quand vous êtes prêt.';
        case 'PasskeyExistsError':
            return 'Cet appareil a déjà une clé d’accès pour votre compte.';
        case 'NotSupportedError':
            return 'Ce navigateur ne prend pas en charge les clés d’accès.';
        case 'InvalidDomainError':
            return 'Les clés d’accès ne fonctionnent pas sur cette adresse. Utilisez l’adresse officielle de Motriks.';
    }

    if (/cancel/i.test(message)) return 'Opération annulée ou délai dépassé. Réessayez quand vous êtes prêt.';
    if (/already registered/i.test(message)) return 'Cet appareil a déjà une clé d’accès pour votre compte.';
    if (/not supported/i.test(message)) return 'Ce navigateur ne prend pas en charge les clés d’accès.';
    if (/can't be used on/i.test(message)) return 'Les clés d’accès ne fonctionnent pas sur cette adresse. Utilisez l’adresse officielle de Motriks.';

    return message || 'La clé d’accès n’a pas pu être utilisée. Réessayez.';
}
