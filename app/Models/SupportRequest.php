<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Demande reçue par le support (centre d'aide ou formulaire de contact), suivie par le
 * super administrateur : nouvelle → répondue → résolue.
 */
#[Fillable([
    'company_id', 'user_id', 'source', 'topic', 'name', 'email', 'phone', 'company_name',
    'message', 'page', 'status', 'answered_at', 'resolved_at',
])]
class SupportRequest extends Model
{
    public const STATUSES = [
        'new' => 'Nouvelle',
        'answered' => 'Répondue',
        'resolved' => 'Résolue',
    ];

    public const SOURCES = [
        'help' => 'Centre d’aide',
        'contact' => 'Formulaire de contact',
    ];

    protected function casts(): array
    {
        return [
            'answered_at' => 'datetime',
            'resolved_at' => 'datetime',
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

    public function replies(): HasMany
    {
        return $this->hasMany(SupportReply::class)->oldest();
    }
}
