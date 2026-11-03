import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { index as companiesIndex } from '@/routes/admin/companies';
import { destroy as moduleDestroy, update as moduleUpdate } from '@/routes/admin/companies/modules';

type ModuleRow = {
    key: string;
    label: string;
    description: string;
    active: boolean;
    ends_on: string | null;
    ends_on_iso: string | null;
    is_trial: boolean;
    expired: boolean;
};

/** Durées proposées ; « sans fin » laisse la date vide. */
const presets: { label: string; days: number | null }[] = [
    { label: 'Essai 14 j', days: 14 },
    { label: '1 mois', days: 30 },
    { label: '1 an', days: 365 },
    { label: 'Sans fin', days: null },
];

const iso = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);

    return d.toISOString().slice(0, 10);
};

function ModuleLine({ companyId, m }: { companyId: number; m: ModuleRow }) {
    const [endsOn, setEndsOn] = useState(m.ends_on_iso ?? '');
    const [trial, setTrial] = useState(m.is_trial);

    const activate = () =>
        router.put(moduleUpdate({ company: companyId, module: m.key }).url, { ends_on: endsOn || null, is_trial: trial }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`${m.label} activé`),
            onError: toastFormError,
        });

    const deactivate = () => {
        if (!confirm(`Désactiver « ${m.label} » ? Les données sont conservées.`)) return;
        router.delete(moduleDestroy({ company: companyId, module: m.key }).url, { preserveScroll: true, onSuccess: () => toast.success(`${m.label} désactivé`) });
    };

    return (
        <li className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{m.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{m.description}</p>
                </div>
                {m.active ? (
                    <StatusBadge tone={m.is_trial ? 'info' : 'success'}>
                        {m.is_trial ? 'Essai' : 'Actif'}
                        {m.ends_on ? ` jusqu’au ${m.ends_on}` : ' sans fin'}
                    </StatusBadge>
                ) : (
                    <StatusBadge tone={m.expired ? 'warning' : 'neutral'}>{m.expired ? `Expiré le ${m.ends_on}` : 'Inactif'}</StatusBadge>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {presets.map((p) => (
                    <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                            setEndsOn(p.days === null ? '' : iso(p.days));
                            setTrial(p.label.startsWith('Essai'));
                        }}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {p.label}
                    </button>
                ))}
                <TextInput type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className="h-9 w-44" aria-label={`Date de fin — ${m.label}`} />
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} />
                    Essai
                </label>
                <ActionButton size="sm" onClick={activate}>
                    {m.active ? 'Mettre à jour' : 'Activer'}
                </ActionButton>
                {m.active && (
                    <ActionButton size="sm" variant="secondary" className="border-red-200 text-red-600 hover:bg-red-50" onClick={deactivate}>
                        Désactiver
                    </ActionButton>
                )}
            </div>
        </li>
    );
}

export default function AdminCompanyModules({ company, modules }: { company: { id: number; name: string }; modules: ModuleRow[] }) {
    return (
        <>
            <Head title={`Modules — ${company.name}`} />

            <Page
                title={`Modules de ${company.name}`}
                description="Activation manuelle, en attendant le paiement en ligne. Sans date de fin, le module reste actif."
                actions={
                    <Link href={companiesIndex().url} className="inline-flex items-center gap-1.5 text-sm font-semibold text-motriks-deep hover:underline">
                        <ArrowLeft className="size-4" />
                        Entreprises
                    </Link>
                }
            >
                <Panel>
                    <ul className="divide-y divide-slate-100">
                        {modules.map((m) => (
                            <ModuleLine key={m.key} companyId={company.id} m={m} />
                        ))}
                    </ul>
                </Panel>
            </Page>
        </>
    );
}

AdminCompanyModules.layout = {
    breadcrumbs: [{ title: 'Entreprises', href: companiesIndex().url }],
};
