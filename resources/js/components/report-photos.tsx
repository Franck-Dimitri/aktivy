import { router } from '@inertiajs/react';
import { Camera, CloudUpload, ImageOff, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { compressImage } from '@/lib/compress-image';
import { toastFormError } from '@/lib/form-toast';

export type ReportPhoto = { id: number; uuid: string; url: string; caption: string | null };

/** Mode hors ligne de l'hôtesse : photos gardées sur le téléphone jusqu'au retour du réseau. */
export type OfflinePhotos = {
    /** Photos prises sans réseau, pas encore envoyées */
    pending: { key: string; blob: Blob; caption: string | null }[];
    /** La photo doit-elle passer par la file (pas de réseau, ou journée encore en attente) ? */
    mustQueue: () => boolean;
    queue: (photo: Blob, fileName: string, caption: string | null) => Promise<void>;
};

type Props = {
    photos: ReportPhoto[];
    /** Adresse d'envoi : absente, la galerie est en lecture seule. */
    uploadUrl?: string;
    /** Adresse de retrait d'une photo (par son uuid) : absente, les photos ne peuvent pas être retirées. */
    deleteUrl?: (photoUuid: string) => string;
    max?: number;
    offline?: OfflinePhotos;
};

/**
 * Photos d'un rapport : vignettes, ajout depuis l'appareil photo ou la galerie
 * (réduites sur le téléphone avant l'envoi), et retrait.
 */
export function ReportPhotos({ photos, uploadUrl, deleteUrl, max = 6, offline }: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const waiting = useMemo(() => offline?.pending ?? [], [offline?.pending]);
    const total = photos.length + waiting.length;
    const canAdd = uploadUrl !== undefined && total < max;

    // Vignettes des photos en attente : adresses locales, libérées quand elles ne servent plus
    const previews = useMemo(() => waiting.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })), [waiting]);
    useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

    const keepForLater = async (photo: File) => {
        if (!offline) return;
        await offline.queue(photo, photo.name || 'photo.jpg', caption || null);
        toast.success('Photo gardée sur le téléphone', { description: 'Elle partira toute seule au retour du réseau.' });
        setCaption('');
        setUploading(false);
        if (input.current) input.current.value = '';
    };

    const upload = async (file: File | undefined) => {
        if (!file || !uploadUrl) return;

        setUploading(true);
        // Photo de téléphone ramenée à ~1600 px : envoi rapide même avec peu de réseau
        const photo = await compressImage(file, {
            maxSide: 1600,
            quality: 0.8,
            minBytes: 400_000,
        });

        if (offline?.mustQueue()) {
            await keepForLater(photo);

            return;
        }

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
                // Réseau perdu pendant l'envoi : la photo attend sur le téléphone
                onNetworkError: () => {
                    if (!offline) return;
                    void keepForLater(photo);

                    return false;
                },
                onFinish: () => {
                    setUploading(false);
                    if (input.current) input.current.value = '';
                },
            },
        );
    };

    const remove = (photo: ReportPhoto) => {
        if (!deleteUrl || !confirm('Retirer cette photo ?')) return;

        router.delete(deleteUrl(photo.uuid), {
            preserveState: true,
            preserveScroll: true,
            onError: toastFormError,
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {total > 0 ? (
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
                    {previews.map((photo) => (
                        <li key={photo.key} className="relative overflow-hidden rounded-xl bg-slate-100 ring-1 ring-sky-200">
                            <img src={photo.url} alt={photo.caption ?? 'Photo en attente'} className="aspect-square w-full object-cover opacity-80" />
                            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-sm">
                                <CloudUpload className="size-3" />
                                En attente
                            </span>
                            {photo.caption && <p className="truncate px-2 py-1.5 text-xs text-slate-600">{photo.caption}</p>}
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
                    {/* Le conteneur porte la largeur : pleine ligne sur téléphone, le reste de la ligne au-delà */}
                    <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                        <TextInput
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            maxLength={200}
                            placeholder="Légende (facultatif) : rayon, stand…"
                            className="h-10"
                            aria-label="Légende de la photo"
                        />
                    </div>
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
            {uploadUrl !== undefined && total >= max && (
                <p className="text-xs text-slate-400">
                    Maximum {max} photos par rapport.
                </p>
            )}
        </div>
    );
}
