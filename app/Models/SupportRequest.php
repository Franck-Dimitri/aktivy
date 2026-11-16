<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Demande reçue par le support (centre d'aide ou formulaire de contact), suivie par le
 * super administrateur : nouvelle → répondue → résolue.
 *
 * @property int $id
 * @property int|null $company_id
 * @property int|null $user_id
 * @property string $source help|contact
 * @property string $topic
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $company_name
 * @property string $message
 * @property string|null $page
 * @property string $status new|answered|resolved
 * @property Carbon|null $answered_at
 * @property Carbon|null $resolved_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Company|null $company
 * @property-read User|null $user
 * @property-read string|null $first_reply_at Agrégat withMin (date de la première réponse)
 */
#[Fillable([
    'company_id', 'user_id', 'source', 'topic', 'name', 'email', 'phone', 'company_name',
    'message', 'page', 'status', 'answered_at', 'resolved_at',
])]
class SupportRequest extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

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

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<SupportReply, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(SupportReply::class)->oldest();
    }
}
