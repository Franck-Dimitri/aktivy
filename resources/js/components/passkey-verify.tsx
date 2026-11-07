import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { Fingerprint } from 'lucide-react';
import { AuthDivider, AuthSecondaryButton } from '@/components/auth/auth-field';
import { passkeyErrorMessage } from '@/lib/passkey-error';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
    separatorPosition?: 'before' | 'after';
};

export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
    separatorPosition = 'after',
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    const divider = (
        <AuthDivider>{separator ?? 'ou avec votre identifiant'}</AuthDivider>
    );

    return (
        <div className="flex flex-col gap-4">
            {separatorPosition === 'before' && divider}

            <div className="grid gap-2">
                <AuthSecondaryButton
                    type="button"
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Spinner />
                    ) : (
                        <Fingerprint className="size-[18px]" />
                    )}
                    {isLoading
                        ? (loadingLabel ?? 'Vérification…')
                        : (label ?? 'Se connecter avec une clé d’accès')}
                </AuthSecondaryButton>
                {error && (
                    <p role="alert" className="text-center text-[13px] leading-snug text-red-600">{passkeyErrorMessage(error)}</p>
                )}
            </div>

            {separatorPosition === 'after' && divider}
        </div>
    );
}
