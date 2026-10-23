<?php

namespace App\Models;

use App\Enums\EventHostessStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $event_id
 * @property int $user_id
 * @property int|null $event_site_id
 * @property bool $recruited_for_event
 * @property EventHostessStatus $status
 */
#[Fillable(['event_id', 'user_id', 'event_site_id', 'recruited_for_event', 'status'])]
class EventHostess extends Model
{
    protected $attributes = [
        'status'               => 'active',
        'recruited_for_event'  => false,
    ];

    protected function casts(): array
    {
        return [
            'status'              => EventHostessStatus::class,
            'recruited_for_event' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function eventSite(): BelongsTo
    {
        return $this->belongsTo(EventSite::class);
    }
}
