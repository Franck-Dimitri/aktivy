import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import { useRef } from 'react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { Field, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { index as importIndex, store as importStore, template as importTemplate } from '@/routes/company/import';

type ImportType = { type: 'sites' | 'produits' | 'personnel'; label: string; columns: string[]; count: number };

type Result = {
    type: string;
    label: string;
    ok: boolean;
    created: number;
    skipped: number;
    errors: string[];
    more_errors: number;
};

const help: Record<ImportType['type'], string> = {
    sites: 'Le nom et la ville sont obligatoires. Un site au même code, ou au même nom dans la même ville, est ignoré.',
    produits: 'Seul le nom est obligatoire. Un produit au même code, ou au même nom, est ignoré.',
    personnel: 'Nom obligatoire, et un téléphone ou un e-mail pour se connecter. Rôle : Hôtesse (par défaut), Superviseur ou Comptable.',
};

function ImportCard({ item }: { item: ImportType }) {
    const input = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, reset } = useForm({ file: null as File | null, password: '' });

    const send = () =>
        post(importStore({ type: item.type }).url, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                reset('file');
                if (input.current) input.current.value = '';
            },
        });

    return (
        <Panel title={item.label} description={`${item.count} déjà enregistré${item.count > 1 ? 's' : ''}`}>
            <div className="flex flex-col gap-4 p-5">
                <p className="text-sm text-slate-600">{help[item.type]}</p>
                <p className="text-xs text-slate-500">
                    Colonnes : <span className="font-medium text-slate-700">{item.columns.join(' · ')}</span>
                </p>

                {item.type === 'personnel' && (
                    <Field label="Mot de passe provisoire des comptes créés" htmlFor={`pwd-${item.type}`} error={errors.password} hint="chacun le change à sa première connexion">
                        <TextInput id={`pwd-${item.type}`} value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} autoComplete="new-password" />
                    </Field>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <a href={importTemplate({ type: item.type }).url} className={buttonClass('secondary', 'md')}>
                        <Download className="size-4" />
                        Modèle Excel
                    </a>
                    <input
                        ref={input}
                        type="file"
                        accept=".xlsx,.csv"
                        className="hidden"
                        onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                    />
                    <ActionButton variant="secondary" icon={<FileSpreadsheet />} onClick={() => input.current?.click()}>
                        {data.file ? data.file.name : 'Choisir le fichier'}
                    </ActionButton>
                    <ActionButton icon={<Upload />} loading={processing} disabled={!data.file} onClick={send}>
                        Importer
                    </ActionButton>
                </div>
                {errors.file && <p className="text-sm text-red-600">{errors.file}</p>}
            </div>
        </Panel>
    );
}

export default function CompanyImport({ types, result, max_rows }: { types: ImportType[]; result: Result | null; max_rows: number }) {
    return (
        <>
            <Head title="Importer vos fichiers" />

            <Page
                title="Importer vos fichiers"
                description={`Reprenez vos listes Excel existantes au lieu de tout saisir. Jusqu’à ${max_rows} lignes par fichier, en .xlsx ou .csv.`}
            >
                <div className="flex flex-col gap-6">
                    {result &&
                        (result.ok ? (
                            <div role="status" className="flex gap-3 rounded-2xl border border-green-200 bg-motriks-soft px-5 py-4 text-sm text-green-900">
                                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-motriks-deep" />
                                <p>
                                    <strong>{result.label} : import terminé.</strong> {result.created} ajouté{result.created > 1 ? 's' : ''}
                                    {result.skipped > 0 && `, ${result.skipped} déjà présent${result.skipped > 1 ? 's' : ''} (ignoré${result.skipped > 1 ? 's' : ''})`}.
                                </p>
                            </div>
                        ) : (
                            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
                                <p className="flex items-center gap-2 font-semibold">
                                    <TriangleAlert className="size-4" />
                                    {result.label} : rien n’a été importé. Corrigez ces lignes puis renvoyez le fichier.
                                </p>
                                <ul className="mt-2 list-disc space-y-0.5 pl-6">
                                    {result.errors.map((e) => (
                                        <li key={e}>{e}</li>
                                    ))}
                                </ul>
                                {result.more_errors > 0 && <p className="mt-1">… et {result.more_errors} autre(s) erreur(s).</p>}
                            </div>
                        ))}

                    <div className="grid gap-6 xl:grid-cols-3">
                        {types.map((t) => (
                            <ImportCard key={t.type} item={t} />
                        ))}
                    </div>
                </div>
            </Page>
        </>
    );
}

CompanyImport.layout = {
    breadcrumbs: [{ title: 'Importer vos fichiers', href: importIndex().url }],
};
