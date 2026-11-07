import { Head, Link, useForm } from '@inertiajs/react';
import { Building2, Mail, MapPin, Phone, Send, User } from 'lucide-react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes/admin';
import {
    index as companiesIndex,
    store as companyStore,
} from '@/routes/admin/companies';

/**
 * Création directe d'une entreprise par le super administrateur, sans dossier d'inscription.
 * Le gérant reçoit une invitation pour choisir son mot de passe.
 */
export default function AdminCompanyCreate({ sectors }: { sectors: string[] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        sector: '',
        city: '',
        address: '',
        phone: '',
        manager_name: '',
        manager_email: '',
        manager_phone: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(companyStore().url, { onError: toastFormError });
    };

    return (
        <>
            <Head title="Créer une entreprise" />

            <Page
                title="Créer une entreprise"
                description="L’entreprise est active tout de suite, avec 14 jours d’essai de tous les modules. Son gérant reçoit un e-mail pour choisir son mot de passe."
                className="max-w-3xl"
            >
                <form onSubmit={submit} className="flex flex-col gap-6">
                    <Panel title="L’entreprise">
                        <div className="flex flex-col gap-4 p-5">
                            <Field
                                label="Nom de l’entreprise"
                                htmlFor="name"
                                required
                                error={errors.name}
                            >
                                <TextInput
                                    id="name"
                                    icon={Building2}
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    error={errors.name}
                                    autoFocus
                                />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Secteur"
                                    htmlFor="sector"
                                    error={errors.sector}
                                >
                                    <SelectInput
                                        id="sector"
                                        value={data.sector}
                                        onChange={(e) =>
                                            setData('sector', e.target.value)
                                        }
                                        error={errors.sector}
                                    >
                                        <option value="">—</option>
                                        {sectors.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </Field>
                                <Field
                                    label="Ville"
                                    htmlFor="city"
                                    error={errors.city}
                                >
                                    <TextInput
                                        id="city"
                                        icon={MapPin}
                                        value={data.city}
                                        onChange={(e) =>
                                            setData('city', e.target.value)
                                        }
                                        error={errors.city}
                                        placeholder="Douala"
                                    />
                                </Field>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Adresse"
                                    htmlFor="address"
                                    error={errors.address}
                                >
                                    <TextInput
                                        id="address"
                                        value={data.address}
                                        onChange={(e) =>
                                            setData('address', e.target.value)
                                        }
                                        error={errors.address}
                                    />
                                </Field>
                                <Field
                                    label="Téléphone de l’entreprise"
                                    htmlFor="phone"
                                    error={errors.phone}
                                >
                                    <TextInput
                                        id="phone"
                                        type="tel"
                                        icon={Phone}
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData('phone', e.target.value)
                                        }
                                        error={errors.phone}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="Le gérant"
                        description="Il recevra l’invitation à cette adresse. Le lien est valable 7 jours."
                    >
                        <div className="flex flex-col gap-4 p-5">
                            <Field
                                label="Nom complet"
                                htmlFor="manager_name"
                                required
                                error={errors.manager_name}
                            >
                                <TextInput
                                    id="manager_name"
                                    icon={User}
                                    value={data.manager_name}
                                    onChange={(e) =>
                                        setData('manager_name', e.target.value)
                                    }
                                    error={errors.manager_name}
                                />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="E-mail"
                                    htmlFor="manager_email"
                                    required
                                    error={errors.manager_email}
                                >
                                    <TextInput
                                        id="manager_email"
                                        type="email"
                                        icon={Mail}
                                        value={data.manager_email}
                                        onChange={(e) =>
                                            setData(
                                                'manager_email',
                                                e.target.value,
                                            )
                                        }
                                        error={errors.manager_email}
                                    />
                                </Field>
                                <Field
                                    label="Téléphone"
                                    htmlFor="manager_phone"
                                    hint="facultatif"
                                    error={errors.manager_phone}
                                >
                                    <TextInput
                                        id="manager_phone"
                                        type="tel"
                                        icon={Phone}
                                        value={data.manager_phone}
                                        onChange={(e) =>
                                            setData(
                                                'manager_phone',
                                                e.target.value,
                                            )
                                        }
                                        error={errors.manager_phone}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Panel>

                    <div className="flex flex-wrap justify-end gap-2">
                        <Link
                            href={companiesIndex().url}
                            className={buttonClass('secondary', 'md')}
                        >
                            Annuler
                        </Link>
                        <ActionButton
                            type="submit"
                            icon={<Send />}
                            loading={processing}
                        >
                            Créer et envoyer l’invitation
                        </ActionButton>
                    </div>
                </form>
            </Page>
        </>
    );
}

AdminCompanyCreate.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Entreprises', href: companiesIndex().url },
    ],
};
