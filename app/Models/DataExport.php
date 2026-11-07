<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Export complet des données d'une entreprise (ZIP), préparé en arrière-plan par BuildCompanyDataExport.
 * Le fichier reste téléchargeable pendant AVAILABLE_HOURS, puis il est supprimé (model:prune).
 */
class DataExport extends Model
{
    use Prunable;

    public const PENDING = 'pending';

    public const PROCESSING = 'processing';

    public const READY = 'ready';

    public const FAILED = 'failed';

    public const AVAILABLE_HOURS = 24;

    /** Disque privé : jamais servi directement, seulement par la route de téléchargement. */
    public const DISK = 'local';

    protected $fillable = ['company_id', 'user_id', 'status', 'path', 'size', 'missing_files', 'started_at', 'finished_at', 'expires_at'];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'missing_files' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** En cours (pas encore prêt ni en échec). */
    public function inProgress(): bool
    {
        return in_array($this->status, [self::PENDING, self::PROCESSING], true);
    }

    /** Prêt, pas encore expiré, et le fichier existe toujours. */
    public function downloadable(): bool
    {
        return $this->status === self::READY
            && $this->expires_at?->isFuture()
            && $this->path !== null
            && Storage::disk(self::DISK)->exists($this->path);
    }

    /** Exports à effacer : expirés, en échec ou bloqués depuis plus d'un jour. */
    public function prunable(): Builder
    {
        return static::query()->where(fn (Builder $q) => $q
            ->where('expires_at', '<', now())
            ->orWhere(fn (Builder $q) => $q->whereIn('status', [self::FAILED, self::PENDING, self::PROCESSING])->where('created_at', '<', now()->subDay())));
    }

    /** Le fichier part avec la ligne. */
    protected function pruning(): void
    {
        if ($this->path) {
            Storage::disk(self::DISK)->delete($this->path);
        }
    }
}
