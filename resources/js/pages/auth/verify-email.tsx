// Components
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import { AuthSecondaryButton } from '@/components/auth/auth-field';
import AuthStatus from '@/components/auth/auth-status';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Vérification de l’e-mail" />

            {status === 'verification-link-sent' && (
                <AuthStatus>
                    Un nouveau lien vient de partir. Pensez à regarder dans vos
                    spams.
                </AuthStatus>
            )}

            <div className="mb-8 flex items-start gap-4 rounded-2xl bg-slate-50 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-aktivy text-ink">
                    <MailCheck className="size-5" />
                </span>
                <div className="min-w-0 text-sm leading-relaxed text-slate-600">
                    <p>Lien envoyé à</p>
                    <p className="truncate font-semibold text-ink">
                        {auth.user?.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Valable 60 minutes.
                    </p>
                </div>
            </div>

            <Form {...send.form()} className="flex flex-col gap-5">
                {({ processing }) => (
                    <>
                        <AuthSecondaryButton disabled={processing}>
                            {processing && <Spinner />}
                            Renvoyer le lien
                        </AuthSecondaryButton>

                        <Link
                            href={logout()}
                            as="button"
                            className="mx-auto cursor-pointer text-sm text-slate-500 underline-offset-4 hover:text-ink hover:underline"
                        >
                            Ce n’est pas votre adresse ? Se déconnecter
                        </Link>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Confirmez votre adresse e-mail',
    description:
        'Cliquez sur le lien que nous venons de vous envoyer pour accéder à votre espace.',
    showcase: 'verify',
};
