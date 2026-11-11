<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureMails();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        // Motriks est en français : dates et durées (« il y a 2 minutes », « mardi 10 novembre »)
        // quelle que soit la langue configurée dans .env
        \Carbon\Carbon::setLocale('fr');
        CarbonImmutable::setLocale('fr');

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Requêtes en boucle (N+1) : une relation chargée paresseusement lève une erreur en local et en test,
        // et n'est que journalisée en production pour ne jamais casser une page
        Model::preventLazyLoading();
        if (app()->isProduction()) {
            Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
                Log::warning('Relation chargée en boucle (N+1) : '.$model::class.'::'.$relation);
            });
        }

        // Mot de passe choisi par l'utilisateur : 8 caractères, une majuscule, une minuscule et un chiffre.
        // Le mot de passe provisoire donné par un gérant n'y est pas soumis (cf. User::PROVISIONAL_PASSWORD_RULES).
        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(8)
                ->mixedCase()
                ->numbers()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Configure the branded transactional emails.
     */
    protected function configureMails(): void
    {
        VerifyEmail::toMailUsing(fn (User $user, string $url): MailMessage => (new MailMessage)
            ->subject('Confirmez votre adresse e-mail · '.config('app.name'))
            ->view(['emails.verify-email', 'emails.text.verify-email'], [
                'user' => $user,
                'url' => $url,
                'expire' => config('auth.verification.expire', 60),
            ]),
        );

        // Mot de passe oublié : même gabarit que les autres e-mails, au lieu de celui de Laravel
        ResetPassword::toMailUsing(fn (User $user, string $token): MailMessage => (new MailMessage)
            ->subject('Réinitialisez votre mot de passe · '.config('app.name'))
            ->view(['emails.reset-password', 'emails.text.reset-password'], [
                'user' => $user,
                'url' => route('password.reset', ['token' => $token, 'email' => $user->getEmailForPasswordReset()]),
                'expire' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
            ]),
        );
    }
}
