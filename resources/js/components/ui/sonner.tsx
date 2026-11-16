import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';

/** Les toasts du serveur sont écoutés par setupFlashToasts(), installé dans app.tsx. */
function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="top-right"
            closeButton
            duration={4000}
            offset={20}
            icons={{
                success: <CircleCheck className="size-5 text-green-600" />,
                error: <CircleAlert className="size-5 text-red-500" />,
                warning: <TriangleAlert className="size-5 text-amber-500" />,
                info: <Info className="size-5 text-blue-500" />,
                loading: <Loader2 className="size-5 animate-spin text-green-600" />,
            }}
            toastOptions={{
                // Lu par les lecteurs d'écran (sonner dit « Close toast » par défaut)
                closeButtonAriaLabel: 'Fermer la notification',
                classNames: {
                    toast: 'group toast !gap-3 !rounded-2xl !border !p-4 !font-sans !shadow-lg !shadow-slate-900/10',
                    title: '!text-sm !font-semibold',
                    description: '!text-[13px] !leading-snug !text-muted-foreground',
                    closeButton: '!border-border !bg-popover',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    // Une fenêtre Radix ouverte coupe les clics hors d'elle (body en pointer-events: none) :
                    // les notifications restent cliquables (fermer, action), la fenêtre <Modal> les ignore
                    pointerEvents: 'auto',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
