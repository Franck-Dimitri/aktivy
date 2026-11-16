<?php

use App\Services\TelegramService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sauvegarde automatique de la BD à 02h00 chaque nuit, puis des fichiers déposés (pièces d'identité,
// photos, documents) à 02h30 ; les deux sont chiffrées et copiées hors du serveur si BACKUP_DISK est défini
Schedule::command('db:backup')->dailyAt('02:00')->withoutOverlapping();
Schedule::command('files:backup')->dailyAt('02:30')->withoutOverlapping();

// Chaque lundi : les dernières sauvegardes se déchiffrent et se relisent-elles ? Alerte Telegram sinon
Schedule::command('backup:verify')->weeklyOn(1, '05:00');

// Battement du planificateur : la route de santé (/sante) signale une panne du cron s'il s'arrête
Schedule::call(fn () => cache()->put('scheduler:heartbeat', now()->getTimestamp(), now()->addHour()))->everyMinute()->name('heartbeat');

// Rapport de statut quotidien à 08h00 (uniquement si le bot est configuré)
Schedule::call(function () {
    $chatId = config('services.telegram.chat_id');
    if (! $chatId) {
        return;
    }

    $telegram = app(TelegramService::class);
    $msg = "☀️ *Rapport matinal Motriks*\n\n";
    $msg .= $telegram->buildStatusMessage()."\n\n";
    $msg .= $telegram->buildStatsMessage();
    $telegram->sendMessage($chatId, $msg);
})->dailyAt('08:00');

// Rappels automatiques, chaque minute : prise de service, retards (hôtesse et responsables), clôture,
// rapport non envoyé, rapports manquants, stocks bas, demandes sans réponse, événements du lendemain,
// abonnements qui expirent. Horaires réglables par entreprise, jamais la nuit, jamais deux fois.
// Remplace notifications:attendance et notifications:report-reminders (commandes conservées pour un envoi manuel).
// Sur le serveur : * * * * * cd /chemin/vers/motriks && php artisan schedule:run >> /dev/null 2>&1
Schedule::command('reminders:run')->everyMinute()->withoutOverlapping()->runInBackground();

// Modules payants qui arrivent à échéance : rappels au gérant (J-30, J-7, J-1, puis le lendemain)
Schedule::command('subscriptions:reminders')->dailyAt('09:00');

// Purge des modèles « Prunable » : exports de données effacés 24 h après leur préparation (et exports
// en échec ou bloqués), statistiques de visite au-delà de leur durée de conservation, etc.
Schedule::command('model:prune')->hourly()->withoutOverlapping();

// Durées de conservation (page Confidentialité) : notifications anciennes, journal d'audit au-delà de
// 12 mois, données personnelles des comptes supprimés depuis 90 jours (cf. PurgeOldDataCommand)
Schedule::command('data:purge')->dailyAt('03:45')->withoutOverlapping();

// Base des pays des visiteurs (DB-IP Lite, publiée chaque mois) : statistiques de trafic par pays
Schedule::command('geoip:update')->monthlyOn(5, '04:15')->withoutOverlapping();

// File d'attente : tâches échouées gardées 30 jours pour analyse (php artisan queue:failed), puis effacées
Schedule::command('queue:prune-failed', ['--hours' => 720])->dailyAt('03:30');
