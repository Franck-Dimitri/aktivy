<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Réponse du support à une demande ; envoyée par e-mail quand la personne a laissé une adresse.
 */
#[Fillable(['support_request_id', 'user_id', 'body', 'emailed'])]
class SupportReply extends Model
{
    protected function casts(): array
    {
        return ['emailed' => 'boolean'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(SupportRequest::class, 'support_request_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
