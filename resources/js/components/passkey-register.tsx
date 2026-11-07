import { usePasskeyRegister } from '@laravel/passkeys/react';
import { useState } from 'react';
import { Fingerprint, KeyRound, Plus } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { Field, TextInput } from '@/components/page/form-fields';
import { passkeyErrorMessage } from '@/lib/passkey-error';

type Props = {
    onSuccess: () => void;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const [name, setName] = useState(() => {
        // Absent pendant le rendu serveur (SSR)
        if (typeof navigator === 'undefined') {
            return '';
        }

        const ua = navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' sur ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            onSuccess();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name);
    };

    const handleCancel = () => {
        setShowForm(false);
        setName('');
    };

    if (!isSupported) {
        return (
            <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-sidebar-border">
                Ce navigateur ne prend pas en charge les clés d’accès. Essayez avec Chrome, Edge ou Safari à jour.
            </p>
        );
    }

    if (!showForm) {
        return (
            <ActionButton variant="secondary" icon={<Plus />} onClick={() => setShowForm(true)}>
                Ajouter une clé d’accès
            </ActionButton>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 dark:border-sidebar-border dark:bg-white/[0.02]">
            <Field label="Nom de la clé" htmlFor="passkey-name" hint="pour la reconnaître plus tard" error={passkeyErrorMessage(error) ?? undefined}>
                <TextInput id="passkey-name" icon={KeyRound} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. : iPhone de travail, PC du bureau" maxLength={60} aria-invalid={error ? true : undefined} autoFocus />
            </Field>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <Fingerprint className="mt-px size-3.5 shrink-0 text-motriks" />
                Votre appareil va vous demander votre empreinte, votre visage ou son code de déverrouillage.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <ActionButton variant="ghost" onClick={handleCancel} disabled={isLoading}>
                    Annuler
                </ActionButton>
                <ActionButton type="submit" loading={isLoading} disabled={!name.trim()}>
                    Créer la clé
                </ActionButton>
            </div>
        </form>
    );
}
