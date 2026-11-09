import { router } from '@inertiajs/react';
import { Eye, FileText, IdCard, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { buttonClass, Spinner } from '@/components/page/buttons';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';

/** Document légal de l'entreprise, tel que renvoyé par App\Support\Company\CompanyDocuments::present(). */
export type LegalDocument = {
    type: string;
    label: string;
    uploaded: boolean;
    kind: 'pdf' | 'image' | null;
    updated_at: string | null;
    url: string | null;
};

const MAX_MB = 10;

/**
 * Liste des documents légaux (CNI recto, verso, registre de commerce) : état, consultation,
 * dépôt ou remplacement. Utilisée sur la fiche entreprise (administration) et dans Identité & marque.
 */
export function LegalDocumentsList({
    documents,
    uploadUrl,
    compact = false,
}: {
    documents: LegalDocument[];
    uploadUrl: (type: string) => string;
    /** Colonne étroite : les boutons passent sous le libellé. */
    compact?: boolean;
}) {
    return (
        <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
            {documents.map((doc) => (
                <DocumentRow
                    key={doc.type}
                    doc={doc}
                    uploadUrl={uploadUrl(doc.type)}
                    compact={compact}
                />
            ))}
        </ul>
    );
}

function DocumentRow({
    doc,
    uploadUrl,
    compact,
}: {
    doc: LegalDocument;
    uploadUrl: string;
    compact: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const upload = (file: File | undefined) => {
        if (!file) return;
        if (file.size > MAX_MB * 1024 * 1024) {
            toast.error(`${doc.label} : le fichier dépasse ${MAX_MB} Mo.`);
            return;
        }

        router.post(
            uploadUrl,
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setUploading(true),
                onFinish: () => {
                    setUploading(false);
                    if (input.current) input.current.value = '';
                },
                onError: toastFormError,
            },
        );
    };

    const Icon = doc.type === 'registration_doc' ? FileText : IdCard;

    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                    doc.uploaded
                        ? 'bg-motriks-soft text-motriks-deep'
                        : 'bg-amber-50 text-amber-600',
                )}
            >
                <Icon className="size-4" />
            </span>
            <div
                className={cn(
                    'min-w-0 flex-1 basis-[calc(100%-3.25rem)]',
                    !compact && 'sm:basis-0',
                )}
            >
                <p
                    className={cn(
                        'text-sm font-semibold text-ink',
                        !compact && 'truncate',
                    )}
                >
                    {doc.label}
                </p>
                <p
                    className={cn(
                        'truncate text-xs',
                        doc.uploaded ? 'text-slate-500' : 'text-amber-700',
                    )}
                >
                    {doc.uploaded
                        ? `${doc.kind === 'pdf' ? 'PDF' : 'Image'} · déposé le ${doc.updated_at}`
                        : 'Manquant'}
                </p>
            </div>
            <div
                className={cn(
                    'ml-[3.25rem] flex gap-1.5',
                    !compact && 'sm:ml-0',
                )}
            >
                {doc.url && (
                    <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener"
                        className={buttonClass('ghost', 'sm')}
                    >
                        <Eye />
                        Voir
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={uploading}
                    className={buttonClass('secondary', 'sm')}
                >
                    {uploading ? <Spinner /> : <Upload />}
                    {doc.uploaded ? 'Remplacer' : 'Déposer'}
                </button>
                <input
                    ref={input}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={`${doc.uploaded ? 'Remplacer' : 'Déposer'} : ${doc.label}`}
                    onChange={(e) => upload(e.target.files?.[0])}
                />
            </div>
        </li>
    );
}

/** « 2 sur 3 » documents déposés : pour l'en-tête des cartes. */
export const documentsCount = (documents: LegalDocument[]) =>
    `${documents.filter((d) => d.uploaded).length} sur ${documents.length}`;
