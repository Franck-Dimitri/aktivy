<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;

/**
 * Trace d'un rappel envoyé : sa clé est unique, un même cas n'est donc jamais rappelé deux fois,
 * même si la commande tourne chaque minute ou sur plusieurs serveurs.
 *
 * @property string $key
 * @property string $type
 */
class ReminderLog extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    /**
     * Réserve la clé ; renvoie false si ce rappel a déjà été envoyé. À appeler juste avant l'envoi.
     */
    public static function claim(string $type, string $key, ?int $companyId): bool
    {
        if (static::where('key', $key)->exists()) {
            return false;
        }

        try {
            static::create(['type' => $type, 'key' => $key, 'company_id' => $companyId, 'sent_at' => now()]);

            return true;
        } catch (QueryException) {
            // Clé prise entre-temps par une autre exécution
            return false;
        }
    }
}
