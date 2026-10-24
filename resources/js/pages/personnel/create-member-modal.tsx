import { useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Phone, Plus, ShieldCheck, User } from 'lucide-react';
import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { store as personnelStore } from '@/routes/personnel';
import type { RoleOption } from '@/types';

type Props = {
    roles: RoleOption[];
    onClose: () => void;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="grid gap-4">
            <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-3.5 w-0.5 rounded-full bg-motriks" aria-hidden="true" />
                    {title}
                </h4>
                {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

/** Modal de création d'un membre. À monter uniquement quand il est ouvert. */
export function CreateMemberModal({ roles, onClose }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        email: '',
        role: (roles[0]?.value ?? 'field_agent') as string,
        password: '',
        password_confirmation: '',
    });

    // Pas de fermeture accidentelle pendant l'enregistrement.
    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(personnelStore().url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Membre ajouté', { description: `${data.name} fait désormais partie de l'équipe.` });
                onClose();
            },
            onError: toastFormError,
        });
    };

    const toggle = (
        <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-green-50 hover:text-motriks-deep"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            tabIndex={-1}
        >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
    );

    return (
        <Modal onClose={close} title="Nouveau membre" description="Ajoutez un membre à votre équipe." size="lg" icon={<Plus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-8 overflow-y-auto px-6 pt-4 pb-6">
                    <Section title="Identité" hint="Les informations de base du membre.">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Nom complet" htmlFor="new-name" required error={errors.name} className="sm:col-span-2">
                                <TextInput
                                    id="new-name"
                                    icon={User}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ex. : Marie Nguema"
                                    error={errors.name}
                                    required
                                    autoFocus
                                />
                            </Field>

                            <Field label="Téléphone" htmlFor="new-phone" hint="(identifiant de connexion)" error={errors.phone}>
                                <TextInput
                                    id="new-phone"
                                    type="tel"
                                    icon={Phone}
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+237 6XX XXX XXX"
                                    error={errors.phone}
                                />
                            </Field>

                            <Field label="E-mail" htmlFor="new-email" hint="(optionnel)" error={errors.email}>
                                <TextInput
                                    id="new-email"
                                    type="email"
                                    icon={Mail}
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="marie@example.com"
                                    error={errors.email}
                                />
                            </Field>

                            <Field label="Rôle" htmlFor="new-role" required error={errors.role} className="sm:col-span-2">
                                <SelectInput
                                    id="new-role"
                                    icon={ShieldCheck}
                                    value={data.role}
                                    onChange={(e) => setData('role', e.target.value)}
                                    error={errors.role}
                                >
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>
                    </Section>

                    <Section title="Accès" hint="Le membre devra changer son mot de passe à la première connexion.">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Mot de passe" htmlFor="new-password" required error={errors.password}>
                                <TextInput
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    error={errors.password}
                                    trailing={toggle}
                                    required
                                />
                            </Field>

                            <Field label="Confirmer le mot de passe" htmlFor="new-password-confirmation" required>
                                <TextInput
                                    id="new-password-confirmation"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                />
                            </Field>
                        </div>
                    </Section>
                </div>

                <footer className="flex items-center justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Créer le membre'}
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
