import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { Page } from '@/components/page/page';
import { GlowStyles, MetricStrip } from '@/components/page/surface';
import { StatusBadge } from '@/components/page/status-badge';
import { index as eventsIndex } from '@/routes/events';
import { EventActionBar } from './event-action-bar';
import { EventTabs } from './event-tabs';
import { TabApercu } from './tab-apercu';
import { TabPdv } from './tab-pdv';
import { TabPacks } from './tab-packs';
import { TabHostesses } from './tab-hostesses';
import { TabVentes } from './tab-ventes';
import { STATUS_TONE, type ShowProps, type TabId } from './types';

export default function EventShow({ event, companySites, companyProducts, availableHostesses, eventSales }: ShowProps) {
    const [tab, setTab] = useState<TabId>('apercu');

    return (
        <>
            <Head title={event.name} />
            <GlowStyles />

            <Page
                title={event.name}
                description={`${event.start_date} → ${event.end_date} · ${event.city}`}
                actions={
                    <div className="flex items-center gap-3">
                        <StatusBadge tone={STATUS_TONE[event.status]}>
                            {event.status_label}
                        </StatusBadge>
                        <EventActionBar event={event} />
                    </div>
                }
            >
                <MetricStrip
                    items={[
                        { label: 'Points de vente', value: event.sites.length },
                        { label: 'Packs produits',  value: event.packs.length },
                        { label: 'Hôtesses',        value: event.hostesses.length },
                        {
                            label: 'Statut',
                            value: event.status_label,
                            sub: event.activated_at ? `Lancé le ${event.activated_at}` : 'Non lancé',
                        },
                    ]}
                />

                <EventTabs
                    active={tab}
                    onChange={setTab}
                    counts={{
                        pdv:      event.sites.length,
                        packs:    event.packs.length,
                        hotesses: event.hostesses.length,
                        ventes:   eventSales.reports_count,
                    }}
                />

                {tab === 'apercu'   && <TabApercu event={event} />}
                {tab === 'pdv'      && <TabPdv event={event} companySites={companySites} />}
                {tab === 'packs'    && <TabPacks event={event} companyProducts={companyProducts} />}
                {tab === 'hotesses' && <TabHostesses event={event} availableHostesses={availableHostesses} />}
                {tab === 'ventes'   && <TabVentes sales={eventSales} />}
            </Page>
        </>
    );
}

EventShow.layout = {
    breadcrumbs: [
        { title: 'Événements', href: eventsIndex().url },
        { title: 'Détail événement' },
    ],
};
