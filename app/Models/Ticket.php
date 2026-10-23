<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $company_id
 * @property int $user_id
 * @property string $subject
 * @property string $body
 * @property string $priority  normal|urgent
 * @property string $status    open|in_review|closed
 * @property string|null $response
 * @property int|null $responded_by
 * @property \Illuminate\Support\Carbon|null $responded_at
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read Company $company
 * @property-read User $agent
 * @property-read User|null $responder
 */
#[Fillable(['company_id', 'user_id', 'subject', 'body', 'priority', 'status', 'response', 'responded_by', 'responded_at'])]
class Ticket extends Model
{
    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }
}
