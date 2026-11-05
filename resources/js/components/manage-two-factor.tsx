import { Form } from '@inertiajs/react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { cn } from '@/lib/utils';
import { SettingsCard } from '@/pages/settings/settings-kit';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <SettingsCard
            icon={Smartphone}
            title="Double authentification"
            description="Un code à 6 chiffres, généré par une application sur votre téléphone, vous est demandé à la connexion."
            badge={
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', twoFactorEnabled ? 'bg-motriks-soft text-motriks-deep ring-green-200/70' : 'bg-slate-50 text-slate-500 ring-slate-200/80 dark:bg-white/5')}>
                    <span className={cn('size-1.5 rounded-full', twoFactorEnabled ? 'bg-motriks' : 'bg-slate-300')} />
                    {twoFactorEnabled ? 'Activée' : 'Désactivée'}
                </span>
            }
        >
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-7">
                {twoFactorEnabled ? (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm leading-relaxed text-slate-500">Votre compte est protégé, même si votre mot de passe venait à être connu.</p>
                            <Form {...disable.form()}>
                                {({ processing }) => (
                                    <ActionButton type="submit" variant="secondary" loading={processing} className="w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 sm:w-auto">
                                        Désactiver
                                    </ActionButton>
                                )}
                            </Form>
                        </div>

                        <TwoFactorRecoveryCodes recoveryCodesList={recoveryCodesList} fetchRecoveryCodes={fetchRecoveryCodes} errors={errors} />
                    </>
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-relaxed text-slate-500">Utilisez Google Authenticator, Microsoft Authenticator ou une application équivalente.</p>
                        {hasSetupData ? (
                            <ActionButton icon={<ShieldCheck />} onClick={() => setShowSetupModal(true)} className="w-full sm:w-auto">
                                Reprendre l’activation
                            </ActionButton>
                        ) : (
                            <Form {...enable.form()} onSuccess={() => setShowSetupModal(true)}>
                                {({ processing }) => (
                                    <ActionButton type="submit" icon={<ShieldCheck />} loading={processing} className="w-full sm:w-auto">
                                        Activer
                                    </ActionButton>
                                )}
                            </Form>
                        )}
                    </div>
                )}
            </div>

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </SettingsCard>
    );
}
