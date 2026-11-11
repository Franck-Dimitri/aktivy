<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Document joint à la fiche d'un membre du personnel.
 *
 * @property int $id
 * @property int $company_id
 * @property int $user_id
 * @property string $type
 * @property string $title
 * @property string $path
 * @property string $original_name
 * @property string $mime
 * @property int $size
 * @property int|null $uploaded_by
 */
#[Fillable(['company_id', 'user_id', 'type', 'title', 'path', 'original_name', 'mime', 'size', 'uploaded_by'])]
class StaffDocument extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    public const TYPES = [
        'id_card' => 'Pièce d’identité',
        'contract' => 'Contrat',
        'certificate' => 'Attestation ou certificat',
        'other' => 'Autre',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by')->withTrashed();
    }
}
