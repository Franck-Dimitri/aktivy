import { Head, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Field, TextInput } from '@/components/page/form-fields';
import { ImagePicker } from '@/components/page/image-picker';
import { Page, Panel } from '@/components/page/page';
import { compressImage } from '@/lib/compress-image';
import { toastFormError } from '@/lib/form-toast';
import { edit as settingsEdit, update as settingsUpdate } from '@/routes/company/settings';

type Company = {
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    primary_color: string | null;
    logo_url: string | null;
};

const DEFAULT_COLOR = '#027a48';

export default function CompanySettings({ company }: { company: Company }) {
    const [removed, setRemoved] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        name: company.name,
        email: company.email ?? '',
        phone: company.phone ?? '',
        city: company.city ?? '',
        address: company.address ?? '',
        primary_color: company.primary_color ?? DEFAULT_COLOR,
        logo: null as File | null,
        remove_logo: false,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(settingsUpdate().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Paramètres enregistrés');
                setData('logo', null);
            },
            onError: toastFormError,
        });
    };

    return (
        <>
            <Head title="Paramètres de l’entreprise" />

            <Page title="Paramètres de l’entreprise" description="Votre identité et vos coordonnées, reprises dans vos rapports PDF et Excel.">
                <form onSubmit={submit} className="flex flex-col gap-6">
                    <Panel title="Identité">
                        <div className="flex flex-col gap-5 p-5">
                            <Field label="Nom de l’entreprise" htmlFor="name" required error={errors.name}>
                                <TextInput id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required maxLength={255} />
                            </Field>

                            <Field label="Logo (JPG ou PNG)" error={errors.logo}>
                                <ImagePicker
                                    file={data.logo}
                                    currentUrl={company.logo_url}
                                    removed={removed}
                                    error={errors.logo}
                                    onChange={async (file) => setData('logo', file ? await compressImage(file, { maxSide: 800, keepPng: true }) : null)}
                                    onRemoveCurrent={() => {
                                        setRemoved(true);
                                        setData('remove_logo', true);
                                    }}
                                    onRestore={() => {
                                        setRemoved(false);
                                        setData('remove_logo', false);
                                    }}
                                />
                            </Field>

                            <Field label="Couleur de vos documents" htmlFor="color" error={errors.primary_color} hint="une couleur trop claire est remplacée par du vert, pour rester lisible">
                                <div className="flex items-center gap-3">
                                    <input
                                        id="color"
                                        type="color"
                                        value={data.primary_color}
                                        onChange={(e) => setData('primary_color', e.target.value)}
                                        className="h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                                    />
                                    <span className="font-mono text-sm text-slate-600">{data.primary_color}</span>
                                </div>
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Coordonnées">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <Field label="E-mail" htmlFor="email" error={errors.email}>
                                <TextInput id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
                            </Field>
                            <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
                                <TextInput id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} />
                            </Field>
                            <Field label="Ville" htmlFor="city" error={errors.city}>
                                <TextInput id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} />
                            </Field>
                            <Field label="Adresse" htmlFor="address" error={errors.address}>
                                <TextInput id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} error={errors.address} />
                            </Field>
                        </div>
                    </Panel>

                    <div className="flex justify-end">
                        <ActionButton type="submit" icon={<Save />} loading={processing}>
                            Enregistrer
                        </ActionButton>
                    </div>
                </form>
            </Page>
        </>
    );
}

CompanySettings.layout = {
    breadcrumbs: [{ title: 'Paramètres', href: settingsEdit().url }],
};
