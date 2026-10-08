import { Form, Head } from '@inertiajs/react';
import {
    AuthPasswordField,
    AuthPrimaryButton,
} from '@/components/auth/auth-field';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';
/* @chisel-passkeys */
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirmer le mot de passe" />

            {/* @chisel-passkeys */}
            <div className="mb-6">
                <PasskeyVerify
                    routes={{
                        options: confirmOptions(),
                        submit: confirmStore(),
                    }}
                    label="Confirmer avec une clé d’accès"
                    loadingLabel="Confirmation…"
                    separator="ou avec votre mot de passe"
                />
            </div>
            {/* @end-chisel-passkeys */}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <AuthPasswordField
                            id="password"
                            name="password"
                            label="Mot de passe"
                            required
                            autoFocus
                            autoComplete="current-password"
                            placeholder="Votre mot de passe"
                            error={errors.password}
                        />

                        <AuthPrimaryButton
                            className="mt-1"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing && <Spinner />}
                            Confirmer
                        </AuthPrimaryButton>
                    </>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirmez votre mot de passe',
    description:
        'Cette zone touche à la sécurité de votre compte. Saisissez à nouveau votre mot de passe pour continuer.',
    showcase: 'security',
};
