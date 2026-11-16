<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
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
 * @property-read Event $event
 * @property-read Site|null $site
 */
#[Fillable(['event_id', 'site_id', 'name', 'address', 'city'])]
class EventSite extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    /**
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * @return BelongsTo<Site, $this>
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /**
     * @return HasMany<EventHostess, $this>
     */
    public function hostesses(): HasMany
    {
        return $this->hasMany(EventHostess::class);
    }

    public function displayName(): string
    {
        return $this->site?->name ?? $this->name ?? 'PDV sans nom';
    }
}
