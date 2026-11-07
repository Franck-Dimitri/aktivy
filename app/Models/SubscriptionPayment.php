<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/**
 * Paiement d'abonnement reçu et enregistré par le super administrateur, avec sa facture.
 *
 * @property int $amount
 * @property string $invoice_number
 * @property string $method
 * @property CarbonImmutable $paid_at
 * @property CarbonImmutable|null $period_start
 * @property CarbonImmutable|null $period_end
 * @property list<string>|null $modules
 */
#[Fillable([
    'company_id', 'invoice_number', 'amount', 'currency', 'method', 'reference',
    'paid_at', 'period_start', 'period_end', 'modules', 'notes', 'recorded_by',
])]
class SubscriptionPayment extends Model
{
    use BelongsToCompany;

    /** Moyens de paiement acceptés, avec leur libellé. */
    public const METHODS = [
        'orange_money' => 'Orange Money',
        'mtn_momo' => 'MTN Mobile Money',
        'virement' => 'Virement bancaire',
        'especes' => 'Espèces',
        'cheque' => 'Chèque',
        'autre' => 'Autre',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'paid_at' => 'immutable_date',
            'period_start' => 'immutable_date',
            'period_end' => 'immutable_date',
            'modules' => 'array',
        ];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function methodLabel(): string
    {
        return self::METHODS[$this->method] ?? $this->method;
    }

    /**
     * Prochain numéro de facture de l'année : FAC-2026-0001, FAC-2026-0002…
     * À appeler dans une transaction : la ligne la plus récente est verrouillée.
     */
    public static function nextInvoiceNumber(?int $year = null): string
    {
        $year ??= (int) now()->format('Y');
        $prefix = "FAC-{$year}-";

        $last = DB::table('subscription_payments')
            ->where('invoice_number', 'like', $prefix.'%')
            ->orderByDesc('invoice_number')
            ->lockForUpdate()
            ->value('invoice_number');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
