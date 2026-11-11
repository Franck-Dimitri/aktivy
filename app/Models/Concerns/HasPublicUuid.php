<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

/**
 * Identifiant public : un UUID (v7, ordonné dans le temps) dans les adresses à la place du numéro.
 *
 * La clé primaire numérique ne change pas (relations, index) ; l'UUID est créé automatiquement
 * et sert de clé de route : route('sites.show', $site) donne /sites/0193…, et une adresse avec
 * un numéro ou un texte qui n'est pas un UUID répond « introuvable ».
 */
trait HasPublicUuid
{
    use HasUuids;

    /** Seule la colonne uuid est générée : la clé primaire reste un entier auto-incrémenté. */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
