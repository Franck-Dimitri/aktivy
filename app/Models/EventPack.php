<?php

namespace App\Models;

use App\Enums\EventPackType;
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
    protected $attributes = [
        'type'   => 'grouped_discount',
        'active' => true,
    ];

    protected function casts(): array
    {
        return [
            'type'   => EventPackType::class,
            'active' => 'boolean',
            'price'  => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(EventPackLine::class);
    }
}
