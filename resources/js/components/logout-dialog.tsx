import { router } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { logout } from '@/routes';

/** Déconnexion avec confirmation. `ask()` ouvre la boîte de dialogue, `dialog` est à rendre dans le JSX. */
export function useLogoutDialog() {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        router.flushAll();
        router.post(
            logout().url,
            {},
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const dialog = (
        <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Se déconnecter ?"
            description="Vous devrez vous reconnecter pour accéder de nouveau à votre espace."
            confirmLabel="Se déconnecter"
            icon={LogOut}
            tone="primary"
            loading={processing}
            onConfirm={confirm}
        />
    );

    return { ask: () => setOpen(true), dialog };
}
