import type { ReactElement } from 'react';
import PasskeyVerify from '@/components/passkey-verify';
import { cn } from '@/lib/utils';
import { authOutlineButton } from './fields';

export type SocialProvider = 'google' | 'apple';

function GoogleLogo() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
        </svg>
    );
}

function AppleLogo() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M16.37 12.73c-.02-2.27 1.86-3.36 1.94-3.41-1.06-1.55-2.7-1.76-3.28-1.78-1.39-.14-2.72.82-3.43.82-.71 0-1.8-.8-2.96-.78a4.38 4.38 0 0 0-3.7 2.25c-1.58 2.74-.4 6.79 1.13 9.01.75 1.09 1.64 2.3 2.81 2.26 1.13-.05 1.55-.73 2.92-.73 1.36 0 1.75.73 2.94.71 1.21-.02 1.98-1.1 2.72-2.2a9.6 9.6 0 0 0 1.24-2.53c-.03-.01-2.37-.91-2.4-3.62ZM14.12 6.06c.62-.76 1.04-1.8.93-2.85-.9.04-1.99.6-2.63 1.35-.58.67-1.08 1.74-.95 2.77 1 .08 2.03-.51 2.65-1.27Z" />
        </svg>
    );
}

const PROVIDERS: Record<SocialProvider, { label: string; logo: () => ReactElement }> = {
    google: { label: 'Google', logo: GoogleLogo },
    apple: { label: 'Apple', logo: AppleLogo },
};

/**
 * Autres façons de se connecter, en haut de la carte.
 * - Clé d'accès (empreinte, visage, code de l'appareil) : active.
 * - Google / Apple : affichés seulement quand le serveur les propose (`providers`), jamais un bouton qui ne mène nulle part.
 */
export function SocialButtons({ providers = [], separator }: { providers?: { name: SocialProvider; href: string }[]; separator: string }) {
    return (
        <div className="flex flex-col gap-2.5">
            {providers.length > 0 && (
                <div className={cn('grid gap-2.5', providers.length > 1 && 'grid-cols-2')}>
                    {providers.map(({ name, href }) => {
                        const { label, logo: Logo } = PROVIDERS[name];
                        return (
                            <a key={name} href={href} className={authOutlineButton}>
                                <Logo />
                                {label}
                            </a>
                        );
                    })}
                </div>
            )}
            <PasskeyVerify label="Clé d’accès" separator={separator} separatorPosition="after" />
        </div>
    );
}
