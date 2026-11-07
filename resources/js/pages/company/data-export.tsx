import { Head, router, usePoll } from '@inertiajs/react';
import { CircleAlert, Clock, Download, FileSpreadsheet, FolderOpen, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionButton, buttonClass, Spinner } from '@/components/page/buttons';
import { Page, Panel } from '@/components/page/page';
import { MetricStrip } from '@/components/page/surface';
import { dataExport } from '@/routes/company';
import { download, prepare } from '@/routes/company/data-export';

type ExportState = {
    id: number;
    status: 'pending' | 'processing' | 'ready' | 'failed' | 'expired';
    size: string | null;
    missing_files: number;
    requested_at: string | null;
    expires_at: string | null;
};

type Props = {
    counts: { users: number; sites: number; products: number; visits: number; reports: number; events: number };
    lastExport: string | null;
    export: ExportState | null;
};

const CONTENTS = [
    'Fiche entreprise et utilisateurs',
    'Sites, produits et stocks par site',
    'Affectations et pointages',
    'Rapports journaliers et ventes détaillées',
    'Événements, points de vente, hôtesses et packs',
    'Tickets et journal d’activité',
];

export default function DataExport({ counts, lastExport, export: current }: Props) {
    const number = new Intl.NumberFormat('fr-FR');

    return (
        <>
            <Head title="Mes données" />

            <Page
                title="Mes données"
                description="Téléchargez à tout moment l’ensemble des informations de votre entreprise enregistrées sur Motriks."
            >
                <MetricStrip
                    items={[
                        { label: 'Utilisateurs', value: number.format(counts.users) },
                        { label: 'Sites', value: number.format(counts.sites), sub: `${number.format(counts.products)} produits` },
                        { label: 'Pointages', value: number.format(counts.visits) },
                        { label: 'Rapports journaliers', value: number.format(counts.reports), sub: `${number.format(counts.events)} événements` },
                    ]}
                />

                <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <Panel title="Export complet" description="Un fichier ZIP prêt à archiver ou à transmettre.">
                        <div className="flex flex-col gap-5 p-5">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
                                    <FileSpreadsheet className="size-5 shrink-0 text-motriks-deep" />
                                    <div>
                                        <p className="text-sm font-semibold text-ink">donnees.xlsx</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Un onglet par type de données, lisible dans Excel, LibreOffice ou Google Sheets.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
                                    <FolderOpen className="size-5 shrink-0 text-motriks-deep" />
                                    <div>
                                        <p className="text-sm font-semibold text-ink">fichiers/</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Logo, documents d’inscription, photos des sites et images des produits.</p>
                                    </div>
                                </div>
                            </div>

                            <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                {CONTENTS.map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <span className="size-1.5 shrink-0 rounded-full bg-motriks" />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <ExportAction current={current} lastExport={lastExport} />
                        </div>
                    </Panel>

                    <Panel title="Confidentialité">
                        <div className="flex gap-3 p-5 text-sm leading-relaxed text-slate-600">
                            <ShieldCheck className="size-5 shrink-0 text-motriks-deep" />
                            <div className="flex flex-col gap-2">
                                <p>Seul le gérant de l’entreprise peut télécharger cet export. Chaque téléchargement est inscrit au journal d’activité.</p>
                                <p>Les mots de passe, les codes de double authentification et les adresses IP n’en font jamais partie.</p>
                                <p>Les éléments supprimés sont inclus, avec leur date de suppression.</p>
                            </div>
                        </div>
                    </Panel>
                </div>
            </Page>
        </>
    );
}

const dateTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

/** Préparation en arrière-plan : bouton, puis « en préparation » (la page se met à jour seule), puis téléchargement. */
function ExportAction({ current, lastExport }: { current: ExportState | null; lastExport: string | null }) {
    const [sending, setSending] = useState(false);
    const inProgress = current?.status === 'pending' || current?.status === 'processing';

    // Tant que l'export se prépare, la page interroge le serveur toutes les 3 s (seulement l'état de l'export)
    const { start, stop } = usePoll(3000, { only: ['export', 'lastExport'] }, { autoStart: false });
    useEffectOnChange(inProgress, (running) => (running ? start() : stop()));

    const launch = () =>
        router.post(prepare().url, {}, { preserveScroll: true, onStart: () => setSending(true), onFinish: () => setSending(false) });

    if (inProgress) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-motriks-soft px-4 py-3.5 text-sm text-motriks-deep">
                <Spinner className="mt-0.5 size-4 shrink-0" />
                <div>
                    <p className="font-semibold">Préparation en cours…</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-motriks-deep/80">Vous pouvez quitter cette page : vous recevrez une notification et un e-mail dès que le fichier sera prêt.</p>
                </div>
            </div>
        );
    }

    if (current?.status === 'ready') {
        return (
            <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-motriks-soft/60 px-4 py-3.5">
                <div className="min-w-0 text-sm">
                    <p className="font-semibold text-ink">Vos données sont prêtes{current.size && ` · ${current.size}`}</p>
                    {current.expires_at && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="size-3.5 shrink-0" />
                            Disponible jusqu’au {dateTime(current.expires_at)}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <ActionButton variant="ghost" icon={<RefreshCw />} loading={sending} onClick={launch}>
                        Préparer à nouveau
                    </ActionButton>
                    <a href={download({ export: current.id }).url} className={buttonClass('primary', 'md')}>
                        <Download className="size-4" />
                        Télécharger
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
                {current?.status === 'failed' ? (
                    <p className="flex items-center gap-1.5 font-medium text-red-600">
                        <CircleAlert className="size-3.5 shrink-0" />
                        La dernière préparation a échoué. Vous pouvez la relancer.
                    </p>
                ) : (
                    <p>{lastExport ? `Dernier export : ${dateTime(lastExport)}` : 'Aucun export réalisé pour le moment.'}</p>
                )}
                <p className="mt-0.5">La préparation se fait en arrière-plan ; le fichier reste disponible 24 h.</p>
            </div>
            <ActionButton icon={<FileSpreadsheet />} loading={sending} onClick={launch}>
                Préparer mes données
            </ActionButton>
        </div>
    );
}

/** Appelle `fn` au montage et à chaque changement de `value`. */
function useEffectOnChange<T>(value: T, fn: (value: T) => void) {
    useEffect(() => fn(value), [value]); // eslint-disable-line react-hooks/exhaustive-deps
}

DataExport.layout = {
    breadcrumbs: [{ title: 'Mes données', href: dataExport() }],
};
