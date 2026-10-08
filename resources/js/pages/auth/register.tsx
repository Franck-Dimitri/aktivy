import { Form, Head } from '@inertiajs/react';
import { Building2, ChevronLeft, Mail, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
    AuthField,
    AuthPasswordField,
    AuthPrimaryButton,
} from '@/components/auth/auth-field';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

const steps = ['Votre entreprise', 'Votre accès'];

export default function Register({ passwordRules }: Props) {
    const [step, setStep] = useState(0);
    const [companyName, setCompanyName] = useState('');
    const companyStep = useRef<HTMLDivElement>(null);

    const continueToAccess = () => {
        const inputs = companyStep.current?.querySelectorAll('input') ?? [];

        for (const input of inputs) {
            if (!input.reportValidity()) {
                return;
            }
        }

        setCompanyName(
            companyStep.current?.querySelector<HTMLInputElement>(
                '#company_name',
            )?.value ?? '',
        );
        setStep(1);
    };

    const onCompanyKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            continueToAccess();
        }
    };

    return (
        <>
            <Head title="Créer un espace entreprise" />

            <ol className="mb-8 grid grid-cols-2 gap-2" aria-label="Étapes">
                {steps.map((label, index) => (
                    <li
                        key={label}
                        aria-current={index === step ? 'step' : undefined}
                        className="grid gap-2"
                    >
                        <span
                            className={cn(
                                'h-1 rounded-full transition-colors duration-300',
                                index <= step ? 'bg-aktivy' : 'bg-slate-200',
                            )}
                        />
                        <span
                            className={cn(
                                'text-xs font-semibold',
                                index === step ? 'text-ink' : 'text-slate-400',
                            )}
                        >
                            {index + 1}. {label}
                        </span>
                    </li>
                ))}
            </ol>

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                onError={(errors) => {
                    if (errors.company_name || errors.name) {
                        setStep(0);
                    }
                }}
            >
                {({ processing, errors }) => (
                    <>
                        <div
                            ref={companyStep}
                            hidden={step !== 0}
                            onKeyDown={onCompanyKeyDown}
                            className="flex flex-col gap-5"
                        >
                            <AuthField
                                id="company_name"
                                name="company_name"
                                type="text"
                                label="Nom de l’entreprise"
                                icon={Building2}
                                required
                                autoFocus
                                autoComplete="organization"
                                placeholder="Ex. : Promo Services SARL"
                                hint="Il apparaîtra sur vos rapports et vos documents."
                                error={errors.company_name}
                            />

                            <AuthField
                                id="name"
                                name="name"
                                type="text"
                                label="Votre nom"
                                icon={UserRound}
                                required
                                autoComplete="name"
                                placeholder="Prénom et nom"
                                error={errors.name}
                            />

                            <AuthPrimaryButton
                                type="button"
                                className="mt-1"
                                onClick={continueToAccess}
                            >
                                Continuer
                            </AuthPrimaryButton>
                        </div>

                        <div
                            hidden={step !== 1}
                            className="flex flex-col gap-5"
                        >
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-xs text-slate-500">
                                        Espace de
                                    </p>
                                    <p className="truncate text-sm font-semibold text-ink">
                                        {companyName}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep(0)}
                                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-aktivy-deep hover:bg-white focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                >
                                    <ChevronLeft className="size-4" />
                                    Modifier
                                </button>
                            </div>

                            <AuthField
                                id="email"
                                name="email"
                                type="email"
                                label="Adresse e-mail professionnelle"
                                icon={Mail}
                                required
                                autoComplete="email"
                                placeholder="vous@entreprise.com"
                                hint="Nous y enverrons un lien pour confirmer votre compte."
                                error={errors.email}
                            />

                            <AuthPasswordField
                                id="password"
                                name="password"
                                label="Mot de passe"
                                required
                                autoComplete="new-password"
                                placeholder="Choisissez un mot de passe"
                                passwordrules={passwordRules}
                                showStrength
                                error={errors.password}
                            />

                            <AuthPasswordField
                                id="password_confirmation"
                                name="password_confirmation"
                                label="Confirmer le mot de passe"
                                required
                                autoComplete="new-password"
                                placeholder="Saisissez-le à nouveau"
                                passwordrules={passwordRules}
                                error={errors.password_confirmation}
                            />

                            <AuthPrimaryButton
                                type="submit"
                                className="mt-1"
                                disabled={processing}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Créer mon espace
                            </AuthPrimaryButton>

                            <p className="text-center text-xs leading-relaxed text-slate-500">
                                Gratuit pour démarrer, sans carte bancaire.
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Créez l’espace de votre entreprise',
    description:
        'Vous en serez l’administrateur, puis vous ajouterez votre équipe depuis votre tableau de bord.',
    showcase: 'register',
    headerLink: {
        text: 'Déjà inscrit ?',
        label: 'Se connecter',
        href: login().url,
    },
};
