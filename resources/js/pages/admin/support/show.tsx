import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Mail,
    Phone,
    RotateCcw,
    Send,
} from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { Field, TextArea } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { dashboard } from '@/routes/admin';
import { show as companyShow } from '@/routes/admin/companies';
import {
    index as supportIndex,
    reply as supportReply,
    status as supportStatus,
} from '@/routes/admin/support';
import { SUPPORT_STATUS } from './index';

type Request = {
    id: number;
    source: string;
    source_label: string;
    topic: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    company_id: number | null;
    company: string | null;
    message: string;
    page: string | null;
    status: 'new' | 'answered' | 'resolved';
    at: string | null;
    replies: {
        id: number;
        body: string;
        author: string | null;
        emailed: boolean;
        at: string | null;
    }[];
};

export default function AdminSupportShow({ request }: { request: Request }) {
    const { data, setData, post, processing, errors, reset, transform } =
        useForm({ body: '' });
    const [closing, setClosing] = useState(false);

    const submit = (resolve: boolean) => {
        setClosing(resolve);
        transform((d) => ({ ...d, resolve }));
        post(supportReply(request.id).url, {
            preserveScroll: true,
            onSuccess: () => reset('body'),
            onError: toastFormError,
        });
    };

    const setStatus = (status: Request['status']) =>
        router.put(
            supportStatus(request.id).url,
            { status },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title={request.topic} />

            <Page
                title={request.topic}
                description={`${request.source_label} · reçue le ${request.at ?? '—'}`}
                className="max-w-4xl"
                actions={
                    request.status === 'resolved' ? (
                        <ActionButton
                            variant="secondary"
                            icon={<RotateCcw />}
                            onClick={() => setStatus('answered')}
                        >
                            Rouvrir
                        </ActionButton>
                    ) : (
                        <ActionButton
                            variant="secondary"
                            icon={<CheckCircle2 />}
                            onClick={() => setStatus('resolved')}
                        >
                            Marquer comme résolue
                        </ActionButton>
                    )
                }
            >
                <div className="flex flex-col gap-6">
                    <div>
                        <StatusBadge tone={SUPPORT_STATUS[request.status].tone}>
                            {SUPPORT_STATUS[request.status].label}
                        </StatusBadge>
                    </div>

                    <Panel
                        title={request.name}
                        description={request.role ?? undefined}
                    >
                        <div className="flex flex-col gap-4 p-5">
                            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                {request.email && (
                                    <a
                                        href={`mailto:${request.email}`}
                                        className="inline-flex items-center gap-1.5 hover:text-motriks-deep"
                                    >
                                        <Mail className="size-3.5" />
                                        {request.email}
                                    </a>
                                )}
                                {request.phone && (
                                    <a
                                        href={`tel:${request.phone}`}
                                        className="inline-flex items-center gap-1.5 hover:text-motriks-deep"
                                    >
                                        <Phone className="size-3.5" />
                                        {request.phone}
                                    </a>
                                )}
                                {request.company &&
                                    (request.company_id ? (
                                        <Link
                                            href={
                                                companyShow(request.company_id)
                                                    .url
                                            }
                                            className="inline-flex items-center gap-1.5 hover:text-motriks-deep"
                                        >
                                            <Building2 className="size-3.5" />
                                            {request.company}
                                        </Link>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Building2 className="size-3.5" />
                                            {request.company}
                                        </span>
                                    ))}
                            </p>
                            <p className="text-sm leading-relaxed whitespace-pre-line text-ink">
                                {request.message}
                            </p>
                            {request.page && (
                                <p className="truncate text-xs text-slate-400">
                                    Envoyé depuis : {request.page}
                                </p>
                            )}
                        </div>
                    </Panel>

                    {request.replies.length > 0 && (
                        <Panel title="Réponses">
                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                {request.replies.map((r) => (
                                    <li
                                        key={r.id}
                                        className="flex flex-col gap-1.5 px-5 py-4"
                                    >
                                        <p className="text-xs text-slate-400">
                                            {r.author ?? 'Support'} · {r.at} ·{' '}
                                            {r.emailed
                                                ? 'envoyée par e-mail'
                                                : 'non envoyée par e-mail'}
                                        </p>
                                        <p className="text-sm whitespace-pre-line text-ink">
                                            {r.body}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    <Panel
                        title="Répondre"
                        description={
                            request.email
                                ? `La réponse part à ${request.email}.`
                                : 'Pas d’adresse e-mail : la réponse sera seulement enregistrée. Appelez la personne si besoin.'
                        }
                    >
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                submit(false);
                            }}
                            className="flex flex-col gap-4 p-5"
                        >
                            <Field
                                label="Votre réponse"
                                htmlFor="reply"
                                error={errors.body}
                            >
                                <TextArea
                                    id="reply"
                                    rows={6}
                                    value={data.body}
                                    onChange={(e) =>
                                        setData('body', e.target.value)
                                    }
                                    error={errors.body}
                                    placeholder={`Bonjour ${request.name.split(' ')[0]},`}
                                />
                            </Field>
                            <div className="flex flex-wrap justify-end gap-2">
                                <ActionButton
                                    type="button"
                                    variant="secondary"
                                    loading={processing && closing}
                                    onClick={() => submit(true)}
                                    disabled={!data.body.trim()}
                                >
                                    Répondre et clore
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    icon={<Send />}
                                    loading={processing && !closing}
                                    disabled={!data.body.trim()}
                                >
                                    Envoyer la réponse
                                </ActionButton>
                            </div>
                        </form>
                    </Panel>
                </div>
            </Page>
        </>
    );
}

AdminSupportShow.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Support', href: supportIndex().url },
    ],
};
