import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { Page, Panel } from '@/components/page/page';
import {
    index as personnelIndex,
    show as personnelShow,
    update as personnelUpdate,
    edit as personnelEdit,
} from '@/routes/personnel';
import { dashboard } from '@/routes';
import type { RoleOption, StatusOption } from '@/types';

type Props = {
    member: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        role: string;
        status: string;
    };
    roles: RoleOption[];
    statuses: StatusOption[];
};

const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';
const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export default function PersonnelEdit({ member, roles, statuses }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, put, processing, errors } = useForm({
        name: member.name,
        phone: member.phone ?? '',
        email: member.email ?? '',
        role: member.role,
        status: member.status,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(personnelUpdate({ personnel: member.id }).url);
    };

    return (
        <>
            <Head title={`Modifier — ${member.name}`} />

            <Page title={`Modifier : ${member.name}`}>
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
                                        className={`${fieldClass} pl-9`}
                                        required
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="phone" className={labelClass}>Téléphone</label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className={`${fieldClass} pl-9`}
                                    />
                                </div>
                                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                            </div>

                            <div>
                                <label htmlFor="email" className={labelClass}>E-mail</label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
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

                            <div>
                                <label htmlFor="status" className={labelClass}>
                                    Statut <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className={fieldClass}
                                >
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Réinitialisation du mot de passe */}
                    <Panel title="Réinitialiser le mot de passe">
                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <p className="sm:col-span-2 text-sm text-slate-500">
                                Laissez vide pour conserver le mot de passe actuel.
                            </p>

                            <div>
                                <label htmlFor="password" className={labelClass}>Nouveau mot de passe</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`${fieldClass} pr-10`}
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
                                    Confirmer
                                </label>
                                <input
                                    id="password_confirmation"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <a
                            href={personnelShow({ personnel: member.id }).url}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-60"
                        >
                            {processing ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </Page>
        </>
    );
}

PersonnelEdit.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Personnel', href: personnelIndex() },
    ],
};
