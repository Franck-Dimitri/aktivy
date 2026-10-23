<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $event_pack_id
 * @property int $product_id
 * @property int $quantity
 * @property string $role  paid | free
 * @property int|null $unit_price
 */
#[Fillable(['event_pack_id', 'product_id', 'quantity', 'role', 'unit_price'])]
class EventPackLine extends Model
{
    protected $attributes = [
        'quantity' => 1,
        'role'     => 'paid',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'integer',
            'unit_price' => 'integer',
        ];
    }

    public function pack(): BelongsTo
    {
        return $this->belongsTo(EventPack::class, 'event_pack_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function isFree(): bool
    {
        return $this->role === 'free';
    }
}
