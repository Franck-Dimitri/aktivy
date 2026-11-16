<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Durées de conservation appliquées pour de bon (page « Confidentialité ») :
 * - notifications : lues, 90 jours ; toutes, 180 jours (la cloche ne remonte pas plus loin) ;
 * - rappels déjà envoyés (dédoublonnage) : 60 jours ;
 * - journal d'audit (adresses IP, appareils) : 12 mois ;
 * - compte supprimé depuis 90 jours : données personnelles effacées (pièces d'identité et documents,
 *   coordonnées, positions GPS des pointages, appareils, sessions). Ses rapports et ventes restent
 *   à l'entreprise (comptabilité, stock), rattachés à « Compte supprimé ».
 *
 * Sans effet sur ce qui est récent ; chaque passage ne traite que ce qui a dépassé sa durée.
 */
class PurgeOldDataCommand extends Command
{
    protected $signature = 'data:purge';

    protected $description = 'Efface les données au-delà de leur durée de conservation';

    public const READ_NOTIFICATIONS_DAYS = 90;

    public const NOTIFICATIONS_DAYS = 180;

    public const REMINDER_LOGS_DAYS = 60;

    public const AUDIT_MONTHS = 12;

    public const DELETED_ACCOUNT_DAYS = 90;

    public function handle(): int
    {
        $notifications = DB::table('notifications')
            ->where(fn ($q) => $q
                ->where(fn ($r) => $r->whereNotNull('read_at')->where('created_at', '<', now()->subDays(self::READ_NOTIFICATIONS_DAYS)))
                ->orWhere('created_at', '<', now()->subDays(self::NOTIFICATIONS_DAYS)))
            ->delete();

        $reminders = DB::table('reminder_logs')->where('sent_at', '<', now()->subDays(self::REMINDER_LOGS_DAYS))->delete();

        $audit = DB::table('audit_logs')->where('created_at', '<', now()->subMonths(self::AUDIT_MONTHS))->delete();

        $accounts = 0;
        User::onlyTrashed()
            ->whereNull('anonymized_at')
            ->where('deleted_at', '<', now()->subDays(self::DELETED_ACCOUNT_DAYS))
            ->each(function (User $user) use (&$accounts) {
                $this->anonymize($user);
                $accounts++;
            });

        $this->info("Notifications : {$notifications} · rappels : {$reminders} · journal : {$audit} · comptes anonymisés : {$accounts}");

        return self::SUCCESS;
    }

    private function anonymize(User $user): void
    {
        // Pièces d'identité et documents du personnel : fichiers puis lignes
        foreach ($user->documents()->get() as $document) {
            Storage::disk('local')->delete($document->path);
            $document->delete();
        }

        DB::transaction(function () use ($user) {
            DB::table('visits')->where('user_id', $user->id)->update([
                'checkin_latitude' => null, 'checkin_longitude' => null,
                'checkout_latitude' => null, 'checkout_longitude' => null,
            ]);
            $user->pushSubscriptions()->delete();
            $user->notifications()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('passkeys')->where('user_id', $user->id)->delete();

            $user->forceFill([
                'name' => 'Compte supprimé',
                // La base exige un e-mail ou un téléphone : adresse factice, non routable (domaine réservé .invalid)
                'email' => "compte-supprime-{$user->id}@supprime.invalid",
                'phone' => null,
                'password' => Hash::make(Str::random(64)),
                'remember_token' => null,
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'last_login_ip' => null,
                'anonymized_at' => now(),
            ])->saveQuietly();
        });
    }
}
