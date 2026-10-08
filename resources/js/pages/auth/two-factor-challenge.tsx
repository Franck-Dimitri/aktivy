import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { AuthField, AuthPrimaryButton } from '@/components/auth/auth-field';
import InputError from '@/components/input-error';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: 'Code de récupération',
                description:
                    'Saisissez l’un des codes de récupération que vous avez conservés lors de l’activation de la double authentification.',
                toggleText: 'utiliser un code d’authentification',
            };
        }

        return {
            title: 'Code d’authentification',
            description:
                'Saisissez le code à 6 chiffres affiché par votre application d’authentification.',
            toggleText: 'utiliser un code de récupération',
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
        showcase: 'two-factor',
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Double authentification" />

            <div className="space-y-6">
                <Form
                    {...store.form()}
                    className="flex flex-col gap-5"
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            {showRecoveryInput ? (
                                <AuthField
                                    id="recovery_code"
                                    name="recovery_code"
                                    type="text"
                                    label="Code de récupération"
                                    icon={KeyRound}
                                    placeholder="xxxxxxxxxx-xxxxxxxxxx"
                                    autoComplete="one-time-code"
                                    autoFocus={showRecoveryInput}
                                    required
                                    error={errors.recovery_code}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-3 text-center">
                                    <div className="flex w-full items-center justify-center">
                                        <InputOTP
                                            name="code"
                                            maxLength={OTP_MAX_LENGTH}
                                            value={code}
                                            onChange={(value) => setCode(value)}
                                            disabled={processing}
                                            pattern={REGEXP_ONLY_DIGITS}
                                            autoFocus
                                        >
                                            <InputOTPGroup className="gap-2">
                                                {Array.from(
                                                    { length: OTP_MAX_LENGTH },
                                                    (_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            className="h-14 w-12 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-ink shadow-none first:rounded-xl last:rounded-xl"
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    <InputError message={errors.code} />
                                </div>
                            )}

                            <AuthPrimaryButton
                                type="submit"
                                disabled={processing}
                            >
                                Continuer
                            </AuthPrimaryButton>

                            <div className="text-center text-sm text-muted-foreground">
                                <span>Ou </span>
                                <button
                                    type="button"
                                    className="cursor-pointer font-semibold text-aktivy-deep underline-offset-4 hover:underline"
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {authConfigContent.toggleText}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
