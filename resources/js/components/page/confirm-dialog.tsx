import { router } from '@inertiajs/react';
import { Trash2, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

/**
 * Remplace window.confirm() : boîte de dialogue propre, avec chargement sur le bouton de confirmation.
 * Le fond flouté et le style (filet, ombre, contour) viennent de <DialogContent> dans ui/dialog.tsx.
 */
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
    const danger = tone === 'danger';

    return (
        <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
            <DialogContent
                accent={danger ? 'red' : 'green'}
                className={cn(
                    'gap-0 p-0 sm:max-w-md',
                    danger && 'shadow-[0_24px_80px_-12px_rgba(220,38,38,0.22)] ring-red-600/15',
                )}
            >
                <div className="flex gap-4 p-6">
                    <span
                        className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-xl border',
                            danger ? 'border-red-100 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-motriks-deep',
                        )}
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
                <div
                    className={cn(
                        'flex flex-col-reverse gap-2 border-t bg-white px-6 py-4 sm:flex-row sm:justify-end',
                        danger ? 'border-slate-100' : 'border-green-100',
                    )}
                >
                    <ActionButton variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
                        Annuler
                    </ActionButton>
                    <ActionButton variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
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