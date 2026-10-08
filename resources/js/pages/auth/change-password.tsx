import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { update } from '@/routes/password/change';

type Props = {
    passwordRules: string;
};

export default function ChangePassword({ passwordRules }: Props) {
    return (
        <>
            <Head title="Choisir un mot de passe" />

            <Form
                {...update.form()}
                resetOnError
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                Nouveau mot de passe
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoFocus
                                autoComplete="new-password"
                                placeholder="Nouveau mot de passe"
                                passwordrules={passwordRules}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirmer le mot de passe
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                autoComplete="new-password"
                                placeholder="Confirmer le mot de passe"
                                passwordrules={passwordRules}
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            data-test="change-password-button"
                        >
                            {processing && <Spinner />}
                            Enregistrer mon mot de passe
                        </Button>

                        <Link
                            href={logout()}
                            as="button"
                            className="text-center text-sm text-muted-foreground underline underline-offset-4"
                        >
                            Se déconnecter
                        </Link>
                    </div>
                )}
            </Form>
        </>
    );
}

ChangePassword.layout = {
    title: 'Choisissez votre mot de passe',
    description:
        'Votre compte a été créé avec un mot de passe provisoire. Remplacez-le par un mot de passe personnel.',
};
