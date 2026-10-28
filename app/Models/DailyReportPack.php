<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Packs d'événement vendus dans un rapport journalier, figés au moment de la vente.
 *
 * @property int $id
 * @property int $daily_report_id
 * @property int|null $event_pack_id
 * @property string $name
 * @property int $unit_value
 * @property int $quantity
 * @property float $revenue
 */
#[Fillable(['daily_report_id', 'event_pack_id', 'name', 'unit_value', 'quantity', 'revenue'])]
class DailyReportPack extends Model
{
    protected function casts(): array
    {
        return [
            'unit_value' => 'integer',
            'quantity' => 'integer',
            'revenue' => 'float',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function eventPack(): BelongsTo
    {
        return $this->belongsTo(EventPack::class);
    }
}
