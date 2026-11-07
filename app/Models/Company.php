<?php

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\Module;
use App\Enums\Plan;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $logo_path
 * @property string|null $primary_color
 * @property string|null $email
 * @property string|null $phone
 * @property string $country
 * @property string $timezone
 * @property string $locale
 * @property string $currency
 * @property AccountStatus $status
 * @property string|null $sector
 * @property string|null $city
 * @property string|null $address
 * @property string|null $id_card_front_path
 * @property string|null $id_card_back_path
 * @property string|null $registration_doc_path
 * @property string|null $rejection_reason
 * @property Carbon|null $onboarding_completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'name', 'slug', 'logo_path', 'primary_color', 'email', 'phone',
    'country', 'timezone', 'locale', 'currency', 'status',
    'sector', 'city', 'address',
    'id_card_front_path', 'id_card_back_path', 'registration_doc_path',
    'rejection_reason', 'onboarding_completed_at',
    'plan', 'plan_ends_on', 'plan_trial', 'plan_extra_packs',
])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory, SoftDeletes;

    private const DEFAULT_DOCUMENT_COLOR = '#027a48';

    /** @var array<int, string>|null */
    private ?array $activeModulesCache = null;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'active',
        'plan' => 'starter',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status'                  => AccountStatus::class,
            'plan'                    => Plan::class,
            'plan_ends_on'            => 'date',
            'plan_trial'              => 'boolean',
            'plan_extra_packs'        => 'integer',
            'onboarding_completed_at' => 'datetime',
            // Rappels automatiques (cf. App\Support\Reminders\ReminderSettings)
            'reminder_settings'       => 'array',
        ];
    }

    /**
     * Get the users of the company.
     *
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the sites (points de vente) of the company.
     *
     * @return HasMany<Site, $this>
     */
    public function sites(): HasMany
    {
        return $this->hasMany(Site::class);
    }

    /**
     * Get the affectations of the company.
     *
     * @return HasMany<Affectation, $this>
     */
    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class);
    }

    /**
     * Get the visits of the company.
     *
     * @return HasMany<Visit, $this>
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    /** Paiements d'abonnement reçus, avec leurs factures. */
    public function subscriptionPayments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(CompanyModule::class);
    }

    /**
     * Modules payants actifs aujourd'hui (calculé une fois par requête).
     *
     * @return array<int, string>
     */
    public function activeModules(): array
    {
        return $this->activeModulesCache ??= array_map(fn (Module $m) => $m->value, $this->currentPlan()->modules());
    }

    public function hasModule(Module $module): bool
    {
        return in_array($module->value, $this->activeModules(), true);
    }

    /**
     * Essai de Motriks Business à la validation (ou à la création) d'une entreprise.
     * Une entreprise qui a déjà un forfait payant ou un essai en cours le garde.
     */
    public function startTrial(int $days = 14): void
    {
        if ($this->currentPlan() !== Plan::Starter) {
            return;
        }

        $this->setPlan(Plan::Business, today()->addDays($days), trial: true);
    }

    /**
     * Forfait en vigueur : un forfait payant ou un essai dont la date est passée redevient Starter.
     */
    public function currentPlan(): Plan
    {
        $plan = $this->plan ?? Plan::Starter;

        return $plan !== Plan::Starter && $this->planExpired() ? Plan::Starter : $plan;
    }

    public function planExpired(): bool
    {
        return $this->plan_ends_on !== null && $this->plan_ends_on->lt(today());
    }

    /** Packs +5 / +5 en vigueur (aucun en Starter ou après expiration). */
    public function activeExtraPacks(): int
    {
        return $this->currentPlan()->acceptsPacks() ? (int) $this->plan_extra_packs : 0;
    }

    /**
     * Limites du forfait en vigueur, packs d'extension compris ; null = illimité.
     *
     * @return array<string, int|null>
     */
    public function planLimits(): array
    {
        $limits = $this->currentPlan()->limits();
        $packs = $this->activeExtraPacks();

        foreach (['hostesses' => Plan::PACK_HOSTESSES, 'sites' => Plan::PACK_SITES] as $key => $step) {
            if ($limits[$key] !== null) {
                $limits[$key] += $packs * $step;
            }
        }

        return $limits;
    }

    /**
     * Change le forfait. Sans date de fin, il est sans limite de durée.
     */
    public function setPlan(Plan $plan, ?\DateTimeInterface $endsOn = null, bool $trial = false, ?int $extraPacks = null): void
    {
        $this->forceFill([
            'plan' => $plan,
            'plan_ends_on' => $plan === Plan::Starter ? null : $endsOn,
            'plan_trial' => $plan !== Plan::Starter && $trial,
            'plan_extra_packs' => $plan->acceptsPacks() ? ($extraPacks ?? (int) $this->plan_extra_packs) : 0,
        ])->save();

        $this->activeModulesCache = null;
    }

    /**
     * Determine if the company may use the platform.
     */
    public function isActive(): bool
    {
        return $this->status === AccountStatus::Active;
    }

    public function isPending(): bool
    {
        return $this->status === AccountStatus::Pending;
    }

    public function isRejected(): bool
    {
        return $this->status === AccountStatus::Rejected;
    }

    public function onboardingCompleted(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    /**
     * Couleur des documents : celle de l'entreprise, sauf si elle est trop claire pour
     * rester lisible (titres sur fond blanc, texte blanc sur l'en-tête Excel).
     */
    public function documentColor(): string
    {
        $color = (string) $this->primary_color;

        if (preg_match('/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i', $color, $m) !== 1) {
            return self::DEFAULT_DOCUMENT_COLOR;
        }

        $luminance = (0.299 * hexdec($m[1]) + 0.587 * hexdec($m[2]) + 0.114 * hexdec($m[3])) / 255;

        return $luminance > 0.65 ? self::DEFAULT_DOCUMENT_COLOR : $color;
    }

    /**
     * Generate a unique slug for the given company name.
     */
    public static function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'entreprise';
        $slug = $base;

        for ($i = 2; static::withTrashed()->where('slug', $slug)->exists(); $i++) {
            $slug = $base.'-'.$i;
        }

        return $slug;
    }
}
