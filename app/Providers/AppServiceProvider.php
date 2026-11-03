<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
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

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
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
