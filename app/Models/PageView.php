<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

/**
 * Une vue d'une page publique du site (voir TrackPageView). Mesure d'audience sans cookie ni service tiers :
 * pas d'adresse IP, un visiteur anonyme renouvelé chaque jour. Conservée RETENTION_MONTHS mois.
 */
class PageView extends Model
{
    use HasFactory, Prunable;

    public const RETENTION_MONTHS = 13;

    public const DEVICES = ['mobile' => 'Mobile', 'tablet' => 'Tablette', 'desktop' => 'Ordinateur'];

    public $timestamps = false;

    protected $fillable = ['path', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign', 'device', 'browser', 'os', 'language', 'country', 'visitor', 'viewed_at'];

    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    /** Vues plus anciennes que la durée de conservation : supprimées par model:prune. */
    public function prunable(): Builder
    {
        return static::where('viewed_at', '<', now()->subMonths(self::RETENTION_MONTHS));
    }
}
