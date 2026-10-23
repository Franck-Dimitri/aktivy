<?php

namespace App\Presenters;

use App\Models\Event;

class EventPresenter
{
    /**
     * Forme complète : utilisée sur la page show (avec sites, packs, hôtesses chargés).
     */
    public static function detail(Event $event): array
    {
        return [
            'id'           => $event->id,
            'name'         => $event->name,
            'description'  => $event->description,
            'status'       => $event->status->value,
            'status_label' => $event->status->label(),
            'status_color' => $event->status->color(),
            'start_date'   => $event->start_date->format('Y-m-d'),
            'end_date'     => $event->end_date->format('Y-m-d'),
            'location'     => $event->location,
            'city'         => $event->city,
            'activated_at' => $event->activated_at?->format('d/m/Y H:i'),
            'sites'        => $event->sites->map(fn ($s) => [
                'id'              => $s->id,
                'name'            => $s->displayName(),
                'address'         => $s->address ?? $s->site?->address,
                'city'            => $s->city ?? $s->site?->city,
                'site_id'         => $s->site_id,
                'hostesses_count' => $s->hostesses->count(),
            ])->all(),
            'packs'        => $event->packs->map(fn ($p) => [
                'id'          => $p->id,
                'name'        => $p->name,
                'description' => $p->description,
                'type'        => $p->type->value,
                'type_label'  => $p->type->label(),
                'price'       => $p->price,
                'active'      => $p->active,
                'lines'       => $p->lines->map(fn ($l) => [
                    'id'         => $l->id,
                    'product_id' => $l->product_id,
                    'product'    => [
                        'id'    => $l->product->id,
                        'name'  => $l->product->name,
                        'image' => $l->product->image,
                    ],
                    'quantity'   => $l->quantity,
                    'role'       => $l->role,
                    'unit_price' => $l->unit_price,
                ])->all(),
            ])->all(),
            'hostesses'    => $event->hostesses->map(fn ($h) => [
                'id'                  => $h->id,
                'user_id'             => $h->user_id,
                'name'                => $h->user->name,
                'phone'               => $h->user->phone,
                'status'              => $h->status->value,
                'recruited_for_event' => $h->recruited_for_event,
                'event_site_id'       => $h->event_site_id,
                'site_name'           => $h->eventSite?->displayName(),
            ])->all(),
        ];
    }

    /**
     * Forme résumée : utilisée dans les listes et cartes.
     */
    public static function summary(Event $event): array
    {
        return [
            'id'              => $event->id,
            'name'            => $event->name,
            'status'          => $event->status->value,
            'status_label'    => $event->status->label(),
            'status_color'    => $event->status->color(),
            'start_date'      => $event->start_date->format('d/m/Y'),
            'end_date'        => $event->end_date->format('d/m/Y'),
            'location'        => $event->location,
            'city'            => $event->city,
            'hostesses_count' => $event->hostesses_count ?? 0,
            'sites_count'     => $event->sites_count ?? 0,
            'packs_count'     => $event->packs_count ?? 0,
        ];
    }
}
