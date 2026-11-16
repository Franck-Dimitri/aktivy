import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

type ModalProps = {
    onClose: () => void;
    title: string;
    description?: string;
    /** `md` pour un petit formulaire, `lg` pour un formulaire long. */
    size?: 'md' | 'lg';
    /** Icône optionnelle affichée dans une pastille verte devant le titre. */
    icon?: ReactNode;
    children: ReactNode;
};

/**
 * Modal flottant minimaliste : fond flouté, carte arrondie (feuille du bas sur téléphone), fermeture
 * via Échap, clic extérieur ou croix. À monter uniquement quand il doit être visible
 * ({open && <Modal …/>}) pour que les formulaires internes se réinitialisent.
 *
 * Construit sur Radix Dialog pour l'accessibilité : le focus reste piégé dans la fenêtre, revient sur
 * le bouton qui l'a ouverte à la fermeture, et le reste de la page est masqué aux lecteurs d'écran.
 * Radix gère aussi les couches : sur Échap (ou le bouton Retour d'Android, cf. lib/back-button.ts),
 * une liste ouverte dans la fenêtre se ferme d'abord, la fenêtre au suivant.
 */
export function Modal({
    onClose,
    title,
    description,
    size = 'md',
    icon,
    children,
}: ModalProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Le fond sert aussi de conteneur de placement : un clic dessus est « à l'extérieur » et ferme */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex animate-in items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[3px] duration-200 fade-in sm:items-center sm:p-6">
                    <DialogPrimitive.Content
                        ref={contentRef}
                        aria-modal="true"
                        // Sans description, on le dit à Radix (sinon il avertit dans la console)
                        {...(description
                            ? {}
                            : { 'aria-describedby': undefined })}
                        // Focus initial sur la fenêtre elle-même, pas sur le premier champ : sur téléphone,
                        // cela ouvrirait le clavier par-dessus la feuille. Un champ en autoFocus garde son focus.
                        onOpenAutoFocus={(e) => {
                            e.preventDefault();
                            if (
                                !contentRef.current?.contains(
                                    document.activeElement,
                                )
                            )
                                contentRef.current?.focus();
                        }}
                        // Toucher une notification (toast) ne doit pas fermer la fenêtre ni perdre le formulaire
                        onInteractOutside={(e) => {
                            if (
                                e.target instanceof Element &&
                                e.target.closest('[data-sonner-toaster]')
                            )
                                e.preventDefault();
                        }}
                        className={`flex max-h-[92vh] w-full supports-[height:100dvh]:max-h-[92dvh] ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} animate-in flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_24px_80px_-12px_rgba(21,128,61,0.28)] ring-1 ring-green-600/15 duration-200 outline-none zoom-in-95 slide-in-from-bottom-4 sm:rounded-3xl sm:pb-0`}
                    >
                        {/* Filet vert fin (même vert que les cartes de surface.tsx) */}
                        <div
                            aria-hidden="true"
                            className="h-0.5 w-full shrink-0 bg-gradient-to-r from-motriks via-green-400 to-transparent"
                        />
                        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
                            <div className="flex min-w-0 items-start gap-3.5">
                                {icon && (
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-motriks-deep [&>svg]:size-5">
                                        {icon}
                                    </span>
                                )}
                                <div className="min-w-0 break-words">
                                    <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-ink">
                                        {title}
                                    </DialogPrimitive.Title>
                                    {description && (
                                        <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">
                                            {description}
                                        </DialogPrimitive.Description>
                                    )}
                                </div>
                            </div>
                            {/* 44 px de cible tactile sur téléphone, plus compact à partir de sm */}
                            <DialogPrimitive.Close
                                aria-label="Fermer"
                                className="-mt-1 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-green-50 hover:text-motriks-deep focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none sm:mt-0 sm:-mr-2 sm:size-9"
                            >
                                <X className="size-5" />
                            </DialogPrimitive.Close>
                        </header>
                        {children}
                    </DialogPrimitive.Content>
                </DialogPrimitive.Overlay>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
