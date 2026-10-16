import { useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { update as personnelUpdate } from '@/routes/personnel';
import type { RoleOption, StatusOption } from '@/types';

type Member = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    role: string;
    status: string;
};

type Props = {
    member: Member;
    roles: RoleOption[];
    statuses: StatusOption[];
    onClose: () => void;
};

/** Modal d'édition d'un membre. À monter uniquement quand il est ouvert. */
export function EditMemberModal({ member, roles, statuses, onClose }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, put, processing, errors } = useForm({
        name: member.name,
        phone: member.phone ?? '',
        email: member.email ?? '',
        role: member.role,
        status: member.status,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(personnelUpdate({ personnel: member.id }).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Membre mis à jour', { description: `Les informations de ${data.name} sont enregistrées.` });
                onClose();
            },
            onError: toastFormError,
        });
    };

    const toggle = (
        <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            tabIndex={-1}
        >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
    );

    return (
        <Modal onClose={onClose} title="Modifier le membre" description="Mettez à jour les informations de ce membre.">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field label="Nom complet" htmlFor="edit-name" required error={errors.name}>
                        <TextInput id="edit-name" icon={User} value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required autoFocus />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Téléphone" htmlFor="edit-phone" error={errors.phone}>
                            <TextInput id="edit-phone" type="tel" icon={Phone} value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} />
                        </Field>
                        <Field label="E-mail" htmlFor="edit-email" error={errors.email}>
                            <TextInput id="edit-email" type="email" icon={Mail} value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
                        </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Rôle" htmlFor="edit-role" required error={errors.role}>
                            <SelectInput id="edit-role" icon={ShieldCheck} value={data.role} onChange={(e) => setData('role', e.target.value)} error={errors.role}>
                                {roles.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field label="Statut" htmlFor="edit-status" required error={errors.status}>
                            <SelectInput id="edit-status" value={data.status} onChange={(e) => setData('status', e.target.value)} error={errors.status}>
                                {statuses.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </SelectInput>
                        </Field>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                        <p className="text-sm font-medium text-ink">Mot de passe</p>
                        <p className="mt-0.5 mb-4 text-xs text-slate-500">Laissez vide pour conserver le mot de passe actuel.</p>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Nouveau" htmlFor="edit-password" error={errors.password}>
                                <TextInput id="edit-password" type={showPassword ? 'text' : 'password'} value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} trailing={toggle} />
                            </Field>
                            <Field label="Confirmer" htmlFor="edit-password-confirmation">
                                <TextInput id="edit-password-confirmation" type={showPassword ? 'text' : 'password'} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={onClose}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Enregistrer'}
                    </ActionButton>
                </footer>
            </form>
        </Modal>
    );
}
