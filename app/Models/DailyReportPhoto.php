<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Photo jointe à un rapport journalier, stockée sur le disque privé.
 *
 * @property int $id
 * @property int $daily_report_id
 * @property string $path
 * @property string|null $caption
 * @property int $size
 */
#[Fillable(['daily_report_id', 'path', 'caption', 'size'])]
class DailyReportPhoto extends Model
{
    /** Nombre maximal de photos par rapport. */
    public const MAX_PER_REPORT = 6;

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    /**
     * Données affichées : l'adresse passe par le contrôle d'accès, jamais par le disque public.
     *
     * @return array{id: int, url: string, caption: string|null}
     */
    public function toView(): array
    {
        return [
            'id' => $this->id,
            'url' => route('report-photos.show', $this),
            'caption' => $this->caption,
        ];
    }
}
