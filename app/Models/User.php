<?php

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Notifications\Auth\QueuedResetPassword;
use App\Notifications\Auth\QueuedVerifyEmail;
use App\Support\PhoneNumber;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use NotificationChannels\WebPush\HasPushSubscriptions;

/**
 * @property int $id
 * @property int|null $company_id
 * @property Role $role
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property bool $must_change_password
 * @property AccountStatus $status
 * @property string $locale
 * @property Carbon|null $last_login_at
 * @property string|null $last_login_ip
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Company|null $company
 */
#[Fillable(['company_id', 'role', 'name', 'email', 'phone', 'password', 'must_change_password', 'status', 'locale'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'last_login_ip'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasPushSubscriptions, Notifiable, PasskeyAuthenticatable, SoftDeletes, TwoFactorAuthenticatable;

    /**
     * Mot de passe provisoire donné par un gérant (membre du personnel, hôtesse d'événement, import) :
     * libre, même « 12345 ». Le compte est créé avec must_change_password, et la personne choisit
     * un vrai mot de passe (règles Password::defaults()) à sa première connexion.
     */
    public const PROVISIONAL_PASSWORD_RULES = ['string', 'min:4', 'max:255'];

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'active',
        'must_change_password' => false,
    ];

    /** Résultat de managedSiteIds(), calculé une fois par requête. */
    private ?array $managedSiteIdsCache = null;

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::updated(function (User $user) {
            foreach (['role' => 'user.role_changed', 'status' => 'user.status_changed'] as $attribute => $action) {
                if ($user->wasChanged($attribute)) {
                    AuditLog::record($action, $user,
                        [$attribute => $user->getOriginal($attribute)?->value],
                        [$attribute => $user->{$attribute}->value],
                    );
                }
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'status' => AccountStatus::class,
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            /* @chisel-2fa */
            'two_factor_confirmed_at' => 'datetime',
            /* @end-chisel-2fa */
        ];
    }

    /**
     * Normalize the phone number to the E.164 format.
     *
     * @return Attribute<string|null, string|null>
     */
    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => PhoneNumber::normalize($value),
        );
    }

    /**
     * Get the company the user belongs to.
     *
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Determine if the user has any of the given roles.
     */
    public function hasRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Determine if the user is the platform super administrator.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === Role::SuperAdmin;
    }

    /**
     * Determine if the user and their company may use the platform.
     */
    public function isActive(): bool
    {
        if ($this->status !== AccountStatus::Active) {
            return false;
        }

        return ! $this->role->belongsToCompany() || ($this->company?->isActive() ?? false);
    }

    /**
     * Sites que l'utilisateur pilote, ou null s'il voit toute l'entreprise (gérant, comptable).
     * Un superviseur ne pilote que les sites où il a une affectation en cours.
     *
     * @return array<int, int>|null
     */
    public function managedSiteIds(): ?array
    {
        if (! $this->hasRole(Role::Supervisor)) {
            return null;
        }

        return $this->managedSiteIdsCache ??= Affectation::query()
            ->where('user_id', $this->id)
            ->ongoing()
            ->distinct()
            ->pluck('site_id')
            ->all();
    }

    /**
     * Determine if the user may manage the given site.
     */
    public function managesSite(int $siteId): bool
    {
        $ids = $this->managedSiteIds();

        return $ids === null || in_array($siteId, $ids, true);
    }

    /**
     * Membres visibles par $viewer. Le superviseur voit les hôtesses de ses sites, ainsi que
     * celles qui n'ont encore aucune affectation, pour pouvoir les affecter.
     *
     * @param  Builder<User>  $query
     */
    public function scopeVisibleTo(Builder $query, User $viewer): void
    {
        $siteIds = $viewer->managedSiteIds();

        if ($siteIds === null) {
            return;
        }

        $query->where('role', Role::FieldAgent)
            ->where(fn ($q) => $q
                ->whereHas('affectations', fn ($a) => $a->ongoing()->whereIn('site_id', $siteIds))
                ->orWhereDoesntHave('affectations', fn ($a) => $a->ongoing()));
    }

    /**
     * Rôles que $viewer peut gérer : le superviseur ne gère que des hôtesses ;
     * le gérant, lui, n'est géré par personne de son entreprise.
     *
     * @return array<int, Role>
     */
    public static function manageableRolesFor(User $viewer): array
    {
        return $viewer->hasRole(Role::Supervisor)
            ? [Role::FieldAgent]
            : [Role::Supervisor, Role::FieldAgent, Role::Accountant];
    }

    /**
     * Pourquoi ce compte ne peut pas être supprimé par son titulaire (null : il peut l'être).
     * Le gérant est le seul responsable de l'entreprise (on ne peut pas en ajouter un autre depuis
     * l'application) : sans lui, l'entreprise resterait sans personne pour la gérer. Idem pour le
     * dernier administrateur de la plateforme.
     */
    public function selfDeletionBlocker(): ?string
    {
        $others = fn (Builder $q) => $q->whereKeyNot($this->getKey())->where('status', AccountStatus::Active);

        if ($this->hasRole(Role::SuperAdmin)
            && ! $others(static::query()->where('role', Role::SuperAdmin))->exists()) {
            return 'Vous êtes le seul administrateur de la plateforme : votre compte ne peut pas être supprimé tant qu’un autre administrateur n’a pas été désigné.';
        }

        if ($this->hasRole(Role::CompanyAdmin) && $this->company
            && ! $others($this->company->users()->getQuery()->where('role', Role::CompanyAdmin))->exists()) {
            return "Vous êtes le seul gérant de « {$this->company->name} » : supprimer votre compte laisserait l’entreprise sans responsable. Pour transmettre l’espace à quelqu’un d’autre ou le fermer, contactez le support.";
        }

        return null;
    }

    /**
     * Ce membre peut-il être géré par $viewer (fiche, documents, modification) ?
     */
    public function isManageableBy(User $viewer): bool
    {
        return $this->company_id === $viewer->company_id
            && $viewer->hasRole(Role::CompanyAdmin, Role::Supervisor)
            && $this->hasRole(...self::manageableRolesFor($viewer))
            && self::visibleTo($viewer)->whereKey($this->id)->exists();
    }

    public function documents(): HasMany
    {
        return $this->hasMany(StaffDocument::class);
    }

    /**
     * Get the URL the user lands on after logging in.
     */
    public function homeUrl(): string
    {
        return route($this->role->homeRoute(), absolute: false);
    }

    /**
     * Determine if the user has verified their email address.
     *
     * Users who log in with a phone number only have nothing to verify.
     */
    public function hasVerifiedEmail(): bool
    {
        return $this->email === null || $this->email_verified_at !== null;
    }

    /**
     * Send the email verification notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        if ($this->email !== null) {
            // En file d'attente : la page répond sans attendre le serveur d'e-mail
            $this->notify(new QueuedVerifyEmail);
        }
    }

    /**
     * Send the password reset notification (en file d'attente).
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedResetPassword($token));
    }

    /**
     * Get the affectations (assignments to sites) of this field agent.
     *
     * @return HasMany<Affectation, $this>
     */
    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class);
    }

    /**
     * Get the visits (check-ins) made by this agent.
     *
     * @return HasMany<Visit, $this>
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * Get the active visit in progress, if any.
     *
     * @return HasMany<Visit, $this>
     */
    public function activeVisit(): HasMany
    {
        return $this->hasMany(Visit::class)->where('status', 'in_progress');
    }
}
