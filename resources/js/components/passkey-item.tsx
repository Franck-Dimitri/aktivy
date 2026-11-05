import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0 dark:border-sidebar-border">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-motriks-soft text-motriks-deep">
                    <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 text-sm font-medium break-words text-ink">{passkey.name}</p>
                        {passkey.authenticator && (
                            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80 dark:bg-white/5">{passkey.authenticator}</span>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Ajoutée {passkey.created_at_diff}
                        {passkey.last_used_at_diff ? ` · utilisée ${passkey.last_used_at_diff}` : ' · jamais utilisée'}
                    </p>
                </div>
            </div>

            <ActionButton variant="icon-danger" size="icon" icon={<Trash2 />} onClick={() => setConfirming(true)} aria-label={`Retirer la clé ${passkey.name}`} />

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title="Retirer cette clé d’accès ?"
                description={<>« {passkey.name} » ne pourra plus servir à vous connecter. Votre mot de passe reste valable.</>}
                confirmLabel="Retirer"
                loading={deleting}
                onConfirm={() => {
                    setDeleting(true);
                    onDelete(passkey.id, () => setDeleting(false));
                }}
            />
        </div>
    );
}
