import { Head, useForm } from '@inertiajs/react';
import { CalendarRange, MapPin, Zap, FileText, Calendar } from 'lucide-react';
import { Page } from '@/components/page/page';
import { GlowCard, GlowStyles } from '@/components/page/surface';
import { ActionButton } from '@/components/page/buttons';
import { TextInput, TextArea } from '@/components/page/form-fields';
import { index as eventsIndex, store as eventStore } from '@/routes/events';

function FormSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-motriks-soft">
                    <Icon className="size-3.5 text-motriks" />
                </div>
                <span className="text-sm font-bold text-slate-700">{title}</span>
                <div className="flex-1 border-t border-slate-100" />
            </div>
            {children}
        </div>
    );
}

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return <p className="text-xs font-medium text-red-500">{msg}</p>;
}

function PreviewCard({ name, start_date, end_date, location, city }: {
    name: string; start_date: string; end_date: string; location: string; city: string;
}) {
    const hasDate = start_date || end_date;
    const hasPlace = location || city;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-px">
            <div className="relative rounded-[15px] bg-gradient-to-br from-slate-800 to-slate-900 p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.08),transparent_60%)]" />
                <div className="relative">
                    <div className="mb-3 flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Brouillon</span>
                    </div>
                    <h3 className="text-lg font-extrabold leading-snug text-white">
                        {name || <span className="italic text-slate-500">Nom de l'événement</span>}
                    </h3>
                    {hasPlace && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="size-3" />
                            {[location, city].filter(Boolean).join(', ')}
                        </p>
                    )}
                    {hasDate && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="size-3" />
                            {start_date || '…'} → {end_date || '…'}
                        </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 border-t border-slate-700 pt-3">
                        {[['0', 'PDV'], ['0', 'Hôtesses'], ['0', 'Packs']].map(([v, l]) => (
                            <div key={l} className="flex flex-col items-center gap-0">
                                <span className="text-xl font-black tabular-nums text-slate-500">{v}</span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-600">{l}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EventCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name:        '',
        description: '',
        start_date:  '',
        end_date:    '',
        location:    '',
        city:        'Yaoundé',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(eventStore().url);
    }

    return (
        <>
            <Head title="Nouvel événement" />
            <GlowStyles />

            <Page
                title="Nouvel événement commercial"
                description="Définissez les informations de base — vous configurerez PDV, packs et hôtesses ensuite."
            >
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* ── Formulaire ── */}
                    <GlowCard contentClassName="p-6 sm:p-8">
                        <form onSubmit={submit} className="flex flex-col gap-7">
                            <FormSection icon={Zap} title="Identité">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">
                                        Nom de l'événement <span className="text-red-400">*</span>
                                    </label>
                                    <TextInput
                                        placeholder="ex. Made in Cameroun 2026"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        error={errors.name}
                                        autoFocus
                                    />
                                    <FieldError msg={errors.name} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-ink">Description</label>
                                    <TextArea
                                        placeholder="Objectifs, contexte, notes importantes…"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </FormSection>

                            <FormSection icon={Calendar} title="Période">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">
                                            Date de début <span className="text-red-400">*</span>
                                        </label>
                                        <TextInput
                                            type="date"
                                            value={data.start_date}
                                            onChange={(e) => setData('start_date', e.target.value)}
                                            error={errors.start_date}
                                        />
                                        <FieldError msg={errors.start_date} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">
                                            Date de fin <span className="text-red-400">*</span>
                                        </label>
                                        <TextInput
                                            type="date"
                                            value={data.end_date}
                                            onChange={(e) => setData('end_date', e.target.value)}
                                            error={errors.end_date}
                                        />
                                        <FieldError msg={errors.end_date} />
                                    </div>
                                </div>
                            </FormSection>

                            <FormSection icon={MapPin} title="Lieu">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">Lieu / Salle</label>
                                        <TextInput
                                            placeholder="ex. Palais des Sports"
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-ink">Ville</label>
                                        <TextInput
                                            placeholder="Yaoundé"
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </FormSection>

                            <FormSection icon={FileText} title="Récapitulatif">
                                <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                                    Après création, vous pourrez ajouter des{' '}
                                    <strong className="text-slate-700">points de vente</strong>,{' '}
                                    des <strong className="text-slate-700">packs produits</strong> et recruter des{' '}
                                    <strong className="text-slate-700">hôtesses</strong> avant de lancer l'événement.
                                </div>
                            </FormSection>

                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2">
                                <ActionButton type="submit" icon={<CalendarRange />} loading={processing}>
                                    Créer l'événement
                                </ActionButton>
                            </div>
                        </form>
                    </GlowCard>

                    {/* ── Aperçu live (desktop uniquement) ── */}
                    <div className="hidden flex-col gap-3 lg:flex">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aperçu</span>
                        <PreviewCard
                            name={data.name}
                            start_date={data.start_date}
                            end_date={data.end_date}
                            location={data.location}
                            city={data.city}
                        />
                        <p className="text-[11px] text-slate-400">
                            Voici comment votre événement apparaîtra dans la liste.
                        </p>
                    </div>
                </div>
            </Page>
        </>
    );
}

EventCreate.layout = {
    breadcrumbs: [
        { title: 'Événements', href: eventsIndex().url },
        { title: 'Nouvel événement' },
    ],
};
