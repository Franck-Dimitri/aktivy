import { router } from '@inertiajs/react';
import { FileText, ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { SelectInput, TextInput } from '@/components/page/form-fields';
import { compressImage } from '@/lib/compress-image';
import { toastFormError } from '@/lib/form-toast';
import { destroy as documentDestroy, show as documentShow, store as documentStore } from '@/routes/personnel/documents';

export type StaffDocumentItem = {
    id: number;
    type_label: string;
    title: string;
    size: number;
    is_pdf: boolean;
    uploaded_at: string;
    uploader: string | null;
};

const size = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(bytes / 1000))} Ko`);

/** Documents de la fiche : pièce d'identité, contrat, attestation… visibles par ceux qui gèrent ce membre. */
export function StaffDocuments({ memberId, documents, types }: { memberId: number; documents: StaffDocumentItem[]; types: { value: string; label: string }[] }) {
    const input = useRef<HTMLInputElement>(null);
    const [type, setType] = useState(types[0]?.value ?? 'other');
    const [title, setTitle] = useState('');
    const [sending, setSending] = useState(false);

    const upload = async (picked: File | undefined) => {
        if (!picked) return;

        setSending(true);
        // Photo d'un papier prise au téléphone : réduite avant l'envoi ; un PDF part tel quel
        const file = await compressImage(picked, { maxSide: 2000, quality: 0.85 });

        router.post(documentStore({ personnel: memberId }).url, { type, title: title || null, file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Document ajouté');
                setTitle('');
            },
            onError: toastFormError,
            onFinish: () => {
                setSending(false);
                if (input.current) input.current.value = '';
            },
        });
    };

    const remove = (doc: StaffDocumentItem) => {
        if (!confirm(`Retirer « ${doc.title} » ? Le fichier sera supprimé.`)) return;

        router.delete(documentDestroy({ personnel: memberId, document: doc.id }).url, {
            preserveScroll: true,
            onSuccess: () => toast.success('Document retiré'),
        });
    };

    return (
        <div>
            {documents.length === 0 ? (
                <p className="flex items-center gap-2 px-5 py-4 text-sm text-slate-500">
                    <Paperclip className="size-4" />
                    Aucun document joint.
                </p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                {d.is_pdf ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
                            </span>
                            <a href={documentShow({ personnel: memberId, document: d.id }).url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
                                <p className="truncate text-sm font-semibold text-ink">{d.title}</p>
                                <p className="text-xs text-slate-500">
                                    {d.type_label} · {size(d.size)} · ajouté le {d.uploaded_at}
                                    {d.uploader && ` par ${d.uploader}`}
                                </p>
                            </a>
                            <button type="button" onClick={() => remove(d)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Retirer ${d.title}`}>
                                <Trash2 className="size-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
                <div className="w-full sm:w-48">
                    <SelectInput value={type} onChange={(e) => setType(e.target.value)} aria-label="Type de document">
                        {types.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </SelectInput>
                </div>
                <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Intitulé (facultatif)" className="min-w-0 flex-1" aria-label="Intitulé du document" />
                <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                <ActionButton icon={<Paperclip />} loading={sending} onClick={() => input.current?.click()}>
                    {sending ? 'Envoi…' : 'Joindre un fichier'}
                </ActionButton>
            </div>
        </div>
    );
}
