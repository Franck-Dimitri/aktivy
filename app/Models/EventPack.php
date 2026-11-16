<?php

namespace App\Models;

use App\Enums\EventPackType;
use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $event_id
 * @property string $name
 * @property string|null $description
 * @property EventPackType $type
 * @property int|null $price
 * @property bool $active
 */
#[Fillable(['event_id', 'name', 'description', 'type', 'price', 'active'])]
class EventPack extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    protected $attributes = [
        'type' => 'grouped_discount',
        'active' => true,
    ];

    protected function casts(): array
    {
        return [
            'type' => EventPackType::class,
            'active' => 'boolean',
            'price' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * @return HasMany<EventPackLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(EventPackLine::class);
    }
}
