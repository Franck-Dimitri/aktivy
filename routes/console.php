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

// Hôtesses attendues qui n'ont pas pointé : vérifié toutes les 30 minutes le matin
Schedule::command('notifications:attendance')->everyThirtyMinutes()->between('7:00', '14:00')->withoutOverlapping();

// Rappel aux hôtesses dont le rapport du jour est encore en brouillon
Schedule::command('notifications:report-reminders')->dailyAt('19:00');
