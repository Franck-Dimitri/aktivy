import { Head } from '@inertiajs/react';
import { Archive, Download, FileSpreadsheet, FolderOpen, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { buttonClass } from '@/components/page/buttons';
import { Page, Panel } from '@/components/page/page';
import { MetricStrip } from '@/components/page/surface';
import { dataExport } from '@/routes/company';
import { download } from '@/routes/company/data-export';

type Props = {
    counts: { users: number; sites: number; products: number; visits: number; reports: number; events: number };
    lastExport: string | null;
};

const CONTENTS = [
    'Fiche entreprise et utilisateurs',
    'Sites, produits et stocks par site',
    'Affectations et pointages',
    'Rapports journaliers et ventes détaillées',
    'Événements, points de vente, hôtesses et packs',
    'Tickets et journal d’activité',
];

export default function DataExport({ counts, lastExport }: Props) {
    const [started, setStarted] = useState(false);
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

                            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-slate-400">
                                    {lastExport
                                        ? `Dernier export : ${new Date(lastExport).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}`
                                        : 'Aucun export réalisé pour le moment.'}
                                </p>
                                <a
                                    href={download().url}
                                    onClick={() => setStarted(true)}
                                    className={buttonClass('primary', 'md')}
                                >
                                    <Download className="size-4" />
                                    Télécharger mes données
                                </a>
                            </div>

                            {started && (
                                <p className="flex items-center gap-2 rounded-xl bg-motriks-soft px-4 py-3 text-sm text-motriks-deep">
                                    <Archive className="size-4 shrink-0" />
                                    La préparation peut prendre quelques secondes, le téléchargement démarrera automatiquement.
                                </p>
                            )}
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

DataExport.layout = {
    breadcrumbs: [{ title: 'Mes données', href: dataExport() }],
};
