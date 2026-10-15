import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
    onClose: () => void;
    title: string;
    description?: string;
    /** `md` pour un petit formulaire, `lg` pour un formulaire long. */
    size?: 'md' | 'lg';
    children: ReactNode;
};

/**
 * Modal flottant minimaliste : fond flouté, carte arrondie, fermeture via Échap,
 * clic extérieur ou croix. À monter uniquement quand il doit être visible
 * ({open && <Modal …/>}) pour que les formulaires internes se réinitialisent.
 */
export function Modal({ onClose, title, description, size = 'md', children }: ModalProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[3px] animate-in fade-in duration-200 sm:items-center sm:p-6"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`flex max-h-[92vh] w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 sm:rounded-3xl`}
            >
                <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
                        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                    >
                        <X className="size-5" />
                    </button>
                </header>
                {children}
            </div>
        </div>,
        document.body,
    );
}
