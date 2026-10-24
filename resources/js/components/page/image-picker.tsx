import { ImagePlus, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { cn } from '@/lib/utils';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

type Props = {
    file: File | null;
    currentUrl?: string | null;
    removed?: boolean;
    onChange: (file: File | null) => void;
    onRemoveCurrent?: () => void;
    onRestore?: () => void;
    error?: string;
    maxMb?: number;
};

export function ImagePicker({ file, currentUrl, removed = false, onChange, onRemoveCurrent, onRestore, error, maxMb = 3 }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const shown = preview ?? (!removed ? (currentUrl ?? null) : null);

    const pick = (next?: File | null) => {
        if (!next) return;
        if (!ACCEPT.includes(next.type)) {
            toast.error('Format non supporté', { description: 'Utilisez une image JPG, PNG ou WEBP.' });
            return;
        }
        if (next.size > maxMb * 1024 * 1024) {
            toast.error('Image trop lourde', { description: `La taille maximale est de ${maxMb} Mo.` });
            return;
        }
        onChange(next);
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT.join(',')}
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />

            {shown ? (
                <div className="flex flex-col gap-4">
                    <img src={shown} alt="Aperçu du produit" className="aspect-4/3 w-full rounded-xl border border-slate-200 object-cover" />
                    {file && <p className="truncate text-xs font-medium text-slate-500">{file.name}</p>}
                    <div className="flex gap-2">
                        <ActionButton variant="secondary" size="sm" icon={<RefreshCw />} onClick={() => inputRef.current?.click()}>
                            Changer
                        </ActionButton>
                        <ActionButton
                            variant="icon-danger"
                            size="sm"
                            icon={<Trash2 />}
                            onClick={() => (file ? onChange(null) : onRemoveCurrent?.())}
                        >
                            Retirer
                        </ActionButton>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
                        className={cn(
                            'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-slate-400 transition-colors focus-visible:ring-4 focus-visible:ring-motriks/15 focus-visible:outline-none',
                            dragging ? 'border-motriks bg-motriks-soft text-motriks-deep' : 'border-slate-200 hover:border-motriks hover:bg-motriks-soft/40 hover:text-motriks-deep',
                        )}
                    >
                        <span className="flex size-11 items-center justify-center rounded-full bg-slate-100">
                            <ImagePlus className="size-5" />
                        </span>
                        <span className="text-sm font-semibold">Ajouter une photo</span>
                        <span className="text-xs">Glissez une image ou cliquez · JPG, PNG, WEBP · {maxMb} Mo max</span>
                    </button>
                    {removed && currentUrl && onRestore && (
                        <ActionButton variant="ghost" size="sm" icon={<Undo2 />} onClick={onRestore} className="self-start">
                            Restaurer l'image actuelle
                        </ActionButton>
                    )}
                </div>
            )}
            {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
}
