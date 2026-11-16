import { router } from '@inertiajs/react';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import {
    store as photoStore,
    destroy as photoDestroy,
} from '@/routes/sites/photos';

/* -------------------------------------------------------------------------- */
/*  Photos                                                                    */
/* -------------------------------------------------------------------------- */

export function PhotoGallery({
    photos,
    siteUuid,
    canAdd,
    canDelete = true,
}: {
    photos: string[];
    siteUuid: string;
    canAdd: boolean;
    canDelete?: boolean;
}) {
    const [lightbox, setLightbox] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const { ask, dialog } = useDeleteDialog<number>({
        getUrl: (index) => photoDestroy({ site: siteUuid, index }).url,
        getTitle: () => 'Supprimer cette photo ?',
        getDescription: () => 'La photo sera retirée de la fiche du site.',
        getSuccessMessage: () => 'Photo supprimée.',
    });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image trop lourde', {
                description: 'La taille maximale est de 3 Mo.',
            });
            e.target.value = '';
            return;
        }
        const form = new FormData();
        form.append('photo', file);
        router.post(photoStore(siteUuid).url, form, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setUploading(true),
            onSuccess: () => toast.success('Photo ajoutée'),
            onError: toastFormError,
            onFinish: () => setUploading(false),
        });
        e.target.value = '';
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
                {photos.map((url, i) => (
                    <div
                        key={url + i}
                        className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50"
                    >
                        <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="size-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
                            onClick={() => setLightbox(url)}
                        />
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => ask(i)}
                                aria-label={`Supprimer la photo ${i + 1}`}
                                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 focus-visible:opacity-100 sm:size-7 pointer-coarse:size-9 pointer-coarse:opacity-100"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                ))}

                {canAdd && (
                    <label
                        className={cn(
                            'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 transition-colors hover:border-motriks hover:bg-motriks-soft/40 hover:text-motriks-deep',
                            uploading && 'pointer-events-none opacity-70',
                        )}
                    >
                        {uploading ? (
                            <Spinner className="size-5" />
                        ) : (
                            <ImagePlus className="size-5" />
                        )}
                        <span className="text-xs font-medium">
                            {uploading ? 'Envoi…' : 'Ajouter une photo'}
                        </span>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={handleFile}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>

            {lightbox && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Aperçu de la photo"
                    tabIndex={-1}
                    // Échap, ou bouton Retour d'Android (lib/back-button.ts), referme l'aperçu
                    onKeyDown={(e) => e.key === 'Escape' && setLightbox(null)}
                    ref={(el) => el?.focus()}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm outline-none"
                    onClick={() => setLightbox(null)}
                >
                    <img
                        src={lightbox}
                        alt="Aperçu"
                        className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        type="button"
                        aria-label="Fermer"
                        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                        onClick={() => setLightbox(null)}
                    >
                        <X className="size-5" />
                    </button>
                </div>
            )}
            {dialog}
        </>
    );
}
