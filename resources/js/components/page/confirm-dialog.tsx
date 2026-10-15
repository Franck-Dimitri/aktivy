import { router } from '@inertiajs/react';
import { Trash2, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel?: string;
    loading?: boolean;
    icon?: LucideIcon;
    tone?: 'danger' | 'primary';
    onConfirm: () => void;
};

/** Remplace window.confirm() : boîte de dialogue propre, avec chargement sur le bouton de confirmation. */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Supprimer',
    loading = false,
    icon: Icon = Trash2,
    tone = 'danger',
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
            <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
                <div className="flex gap-4 p-6">
                    <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-aktivy-soft text-aktivy-deep'}`}
                    >
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                        <DialogTitle className="text-base font-semibold text-ink">{title}</DialogTitle>
                        <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-500">
                            {description}
                        </DialogDescription>
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                    <ActionButton variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
                        Annuler
                    </ActionButton>
                    <ActionButton variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
                        {confirmLabel}
                    </ActionButton>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Suppression avec confirmation + toasts. Usage :
 *   const { ask, dialog } = useDeleteDialog<Item>({ ... });
 *   <button onClick={() => ask(item)} />  …  {dialog}
 */
export function useDeleteDialog<T>({
    getUrl,
    getTitle,
    getDescription,
    getSuccessMessage,
    confirmLabel = 'Supprimer',
    icon,
}: {
    getUrl: (item: T) => string;
    getTitle: (item: T) => string;
    getDescription: (item: T) => ReactNode;
    getSuccessMessage: (item: T) => string;
    confirmLabel?: string;
    icon?: LucideIcon;
}) {
    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState<T | null>(null);
    const [processing, setProcessing] = useState(false);

    const ask = (item: T) => {
        setTarget(item);
        setOpen(true);
    };

    const confirm = () => {
        if (target === null) return;

        router.delete(getUrl(target), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onSuccess: () => {
                toast.success(getSuccessMessage(target));
                setOpen(false);
            },
            onError: () => toast.error('Action impossible', { description: 'Une erreur est survenue. Réessayez.' }),
            onFinish: () => setProcessing(false),
        });
    };

    const dialog =
        target === null ? null : (
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title={getTitle(target)}
                description={getDescription(target)}
                confirmLabel={confirmLabel}
                icon={icon}
                loading={processing}
                onConfirm={confirm}
            />
        );

    return { ask, dialog };
}
