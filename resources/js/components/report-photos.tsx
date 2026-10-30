import { router } from '@inertiajs/react';
import { Camera, ImageOff, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { compressImage } from '@/lib/compress-image';
import { toastFormError } from '@/lib/form-toast';

export type ReportPhoto = { id: number; url: string; caption: string | null };

type Props = {
    photos: ReportPhoto[];
    /** Adresse d'envoi : absente, la galerie est en lecture seule. */
    uploadUrl?: string;
    /** Adresse de retrait d'une photo : absente, les photos ne peuvent pas être retirées. */
    deleteUrl?: (photoId: number) => string;
    max?: number;
};

/**
 * Photos d'un rapport : vignettes, ajout depuis l'appareil photo ou la galerie
 * (réduites sur le téléphone avant l'envoi), et retrait.
 */
export function ReportPhotos({ photos, uploadUrl, deleteUrl, max = 6 }: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const canAdd = uploadUrl !== undefined && photos.length < max;

    const upload = async (file: File | undefined) => {
        if (!file || !uploadUrl) return;

        setUploading(true);
        // Photo de téléphone ramenée à ~1600 px : envoi rapide même avec peu de réseau
        const photo = await compressImage(file, {
            maxSide: 1600,
            quality: 0.8,
            minBytes: 400_000,
        });

        router.post(
            uploadUrl,
            { photo, caption: caption || null },
            {
                forceFormData: true,
                // Les ventes saisies mais pas encore enregistrées restent à l'écran
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Photo ajoutée');
                    setCaption('');
                },
                onError: toastFormError,
                onFinish: () => {
                    setUploading(false);
                    if (input.current) input.current.value = '';
                },
            },
        );
    };

    const remove = (photo: ReportPhoto) => {
        if (!deleteUrl || !confirm('Retirer cette photo ?')) return;

        router.delete(deleteUrl(photo.id), {
            preserveState: true,
            preserveScroll: true,
            onError: toastFormError,
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {photos.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map((photo) => (
                        <li
                            key={photo.id}
                            className="group relative overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
                        >
                            <a
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <img
                                    src={photo.url}
                                    alt={photo.caption ?? 'Photo du rapport'}
                                    loading="lazy"
                                    className="aspect-square w-full object-cover"
                                />
                            </a>
                            {photo.caption && (
                                <p className="truncate px-2 py-1.5 text-xs text-slate-600">
                                    {photo.caption}
                                </p>
                            )}
                            {deleteUrl && (
                                <button
                                    type="button"
                                    onClick={() => remove(photo)}
                                    className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-lg bg-white/90 text-red-600 shadow-sm hover:bg-white"
                                    aria-label="Retirer la photo"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                    <ImageOff className="size-4" />
                    Aucune photo.
                </p>
            )}

            {canAdd && (
                <div className="flex flex-wrap items-center gap-2">
                    <TextInput
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        maxLength={200}
                        placeholder="Légende (facultatif) : rayon, stand…"
                        className="h-10 min-w-0 flex-1"
                        aria-label="Légende de la photo"
                    />
                    <input
                        ref={input}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => upload(e.target.files?.[0])}
                    />
                    <ActionButton
                        icon={<Camera />}
                        loading={uploading}
                        onClick={() => input.current?.click()}
                    >
                        {uploading ? 'Envoi…' : 'Ajouter une photo'}
                    </ActionButton>
                </div>
            )}
            {uploadUrl !== undefined && photos.length >= max && (
                <p className="text-xs text-slate-400">
                    Maximum {max} photos par rapport.
                </p>
            )}
        </div>
    );
}
