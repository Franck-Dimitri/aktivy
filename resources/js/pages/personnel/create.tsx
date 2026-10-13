import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { Page, Panel } from '@/components/page/page';
import { index as personnelIndex, store as personnelStore, create as personnelCreate } from '@/routes/personnel';
import { dashboard } from '@/routes';
import type { RoleOption } from '@/types';

type Props = {
    roles: RoleOption[];
};

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';
const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function PersonnelCreate({ roles }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        email: '',
        role: (roles[0]?.value ?? 'field_agent') as string,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(personnelStore().url);
    };

    return (
        <>
            <Head title="Nouveau membre" />

            <Page title="Nouveau membre" description="Ajoutez un membre à votre équipe.">
                <form onSubmit={submit} className="flex flex-col gap-6">
                    {/* Identité */}
                    <Panel title="Identité">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="name" className={labelClass}>
                                    Nom complet <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Ex. : Marie Nguema"
                                        className={`${fieldClass} pl-9`}
                                        required
                                        autoFocus
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="phone" className={labelClass}>
                                    Téléphone
                                    <span className="ml-1 text-xs font-normal text-slate-400">(identifiant de connexion)</span>
                                </label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="+237 6XX XXX XXX"
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                            </div>

                            <div>
                                <label htmlFor="email" className={labelClass}>
                                    E-mail
                                    <span className="ml-1 text-xs font-normal text-slate-400">(optionnel)</span>
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="marie@example.com"
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                            </div>

                            <div>
                                <label htmlFor="role" className={labelClass}>
                                    Rôle <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <ShieldCheck className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <select
                                        id="role"
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    >
                                        {roles.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Mot de passe */}
                    <Panel title="Accès">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <p className="sm:col-span-2 text-sm text-slate-500">
                                Le membre devra changer son mot de passe à la première connexion.
                            </p>

                            <div>
                                <label htmlFor="password" className={labelClass}>
                                    Mot de passe <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`${fieldClass} pr-10`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                            </div>

                            <div>
                                <label htmlFor="password_confirmation" className={labelClass}>
                                    Confirmer le mot de passe <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="password_confirmation"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className={fieldClass}
                                    required
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <a
                            href={personnelIndex().url}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-60"
                        >
                            {processing ? 'Enregistrement…' : 'Créer le membre'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

PersonnelCreate.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
        { title: 'Nouveau membre', href: personnelCreate() },
    ],
};
