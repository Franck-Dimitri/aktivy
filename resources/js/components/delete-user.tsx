import { Link, useForm } from '@inertiajs/react';
import { LifeBuoy, LockKeyhole, ShieldAlert, TriangleAlert, UserX } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { ActionButton } from '@/components/page/buttons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PasswordField, SettingsCard } from '@/pages/settings/settings-kit';
import { help } from '@/routes';

/**
 * Fermeture du compte : bouton discret, puis confirmation par mot de passe.
 * `blocker` : raison pour laquelle le compte ne peut pas être supprimé (seul gérant de l'entreprise…).
 */
export default function DeleteUser({ blocker }: { blocker?: string | null }) {
    const [open, setOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);
    const form = useForm({ password: '' });

    const close = (next: boolean) => {
        if (form.processing) return;
        setOpen(next);
        if (!next) {
            form.reset();
            form.clearErrors();
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.delete(ProfileController.destroy().url, {
            preserveScroll: true,
            onError: () => passwordInput.current?.focus(),
            onFinish: () => form.reset('password'),
        });
    };

    if (blocker) {
        return (
            <SettingsCard icon={UserX} title="Supprimer mon compte" description="Votre compte est indispensable à votre entreprise.">
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600" data-test="delete-user-blocked">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        {blocker}
                    </p>
                    <Link
                        href={help().url}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                        <LifeBuoy className="size-4" />
                        Contacter le support
                    </Link>
                </div>
            </SettingsCard>
        );
    }

    return (
        <SettingsCard icon={UserX} tone="danger" title="Supprimer mon compte" description="Vous serez déconnecté et ne pourrez plus vous connecter avec ces identifiants.">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-500">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-500" />
                    Vous ne pourrez pas annuler cette action vous-même.
                </p>
                <ActionButton variant="secondary" className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50" onClick={() => setOpen(true)} data-test="delete-user-button">
                    Supprimer mon compte
                </ActionButton>
            </div>

            <Dialog open={open} onOpenChange={close}>
                <DialogContent accent="red" className="gap-0 p-0 shadow-[0_24px_80px_-12px_rgba(220,38,38,0.22)] ring-red-600/15 sm:max-w-md">
                    <form onSubmit={submit}>
                        <div className="flex gap-4 p-6 pb-5">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
                                <UserX className="size-5" />
                            </span>
                            <div className="min-w-0 pt-0.5">
                                <DialogTitle className="text-base font-semibold text-ink">Supprimer votre compte ?</DialogTitle>
                                <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-500">
                                    Vous serez déconnecté immédiatement. Saisissez votre mot de passe pour confirmer.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <label htmlFor="password" className="sr-only">
                                Mot de passe
                            </label>
                            <PasswordField
                                id="password"
                                ref={passwordInput}
                                icon={LockKeyhole}
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                error={form.errors.password}
                                placeholder="Votre mot de passe"
                                autoComplete="current-password"
                                autoFocus
                            />
                            {form.errors.password && (
                                <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                                    {form.errors.password}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                            <ActionButton variant="secondary" disabled={form.processing} onClick={() => close(false)}>
                                Annuler
                            </ActionButton>
                            <ActionButton type="submit" variant="danger" loading={form.processing} disabled={!form.data.password} data-test="confirm-delete-user-button">
                                Supprimer mon compte
                            </ActionButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </SettingsCard>
    );
}
