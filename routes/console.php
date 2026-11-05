<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sauvegarde automatique de la BD à 02h00 chaque nuit
Schedule::command('db:backup')->dailyAt('02:00')->withoutOverlapping();

// Rapport de statut quotidien à 08h00 (uniquement si le bot est configuré)
Schedule::call(function () {
    $chatId = config('services.telegram.chat_id');
    if (!$chatId) return;

    $telegram = app(\App\Services\TelegramService::class);
    $msg  = "☀️ *Rapport matinal Motriks*\n\n";
    $msg .= $telegram->buildStatusMessage() . "\n\n";
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
