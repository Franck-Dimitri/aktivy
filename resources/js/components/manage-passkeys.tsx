import { router } from '@inertiajs/react';
import { Fingerprint, KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import { SettingsCard } from '@/pages/settings/settings-kit';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), { preserveScroll: true, onError });
    };

    return (
        <SettingsCard icon={Fingerprint} title="Clés d’accès" description="Connectez-vous avec l’empreinte, le visage ou le code de votre appareil, sans mot de passe.">
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-7">
                {passkeys.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-sidebar-border">
                        {passkeys.map((passkey) => (
                            <PasskeyItem key={passkey.id} passkey={passkey} onDelete={handleDelete} />
                        ))}
                    </div>
                ) : (
                    <p className="flex items-center gap-2.5 text-sm text-slate-500">
                        <KeyRound className="size-4 shrink-0 text-slate-300" />
                        Aucune clé d’accès pour l’instant.
                    </p>
                )}

                <div>
                    <PasskeyRegistration onSuccess={() => router.reload()} />
                </div>
            </div>
        </SettingsCard>
    );
}
