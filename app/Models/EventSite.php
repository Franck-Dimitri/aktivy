<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $event_id
 * @property int|null $site_id
 * @property string|null $name
 * @property string|null $address
 * @property string|null $city
 */
#[Fillable(['event_id', 'site_id', 'name', 'address', 'city'])]
class EventSite extends Model
{
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function hostesses(): HasMany
    {
        return $this->hasMany(EventHostess::class);
    }

    public function displayName(): string
    {
        return $this->site?->name ?? $this->name ?? 'PDV sans nom';
    }
}
