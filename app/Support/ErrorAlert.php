<?php

namespace App\Support;

use App\Services\TelegramService;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Alerte de l'équipe sur Telegram quand une erreur serveur survient ou qu'une tâche de la file échoue :
 * sans cela, les pannes étaient découvertes par les clients.
 *
 * Volontairement minimale : type d'erreur, fichier et ligne, adresse sans paramètres. Jamais le message
 * de l'erreur (il peut contenir des données personnelles ou une requête SQL avec ses valeurs).
 * Une même erreur n'est signalée qu'une fois toutes les 10 minutes. Seulement en production.
 */
final class ErrorAlert
{
    private const SILENCE_SECONDS = 600;

    public static function exception(Throwable $e): void
    {
        $where = basename($e->getFile()).':'.$e->getLine();
        $request = app()->runningInConsole() ? 'console' : request()->method().' /'.ltrim(request()->path(), '/');

        self::send(class_basename($e).'|'.$where, "🔥 Erreur Motriks\n".class_basename($e)."\n{$where}\n{$request}");
    }

    public static function failedJob(string $job, Throwable $e): void
    {
        $where = basename($e->getFile()).':'.$e->getLine();

        self::send('job|'.$job.'|'.$where, "⚠️ Tâche en échec\n".class_basename($job)."\n".class_basename($e)." · {$where}");
    }

    private static function send(string $signature, string $text): void
    {
        $chatId = config('services.telegram.chat_id');

        if (! app()->isProduction() || ! $chatId || ! config('services.telegram.bot_token')) {
            return;
        }

        try {
            // Cache::add n'écrit que si la clé n'existe pas : une alerte par erreur et par période
            if (! Cache::add('error-alert:'.md5($signature), true, self::SILENCE_SECONDS)) {
                return;
            }

            app(TelegramService::class)->sendMessage($chatId, $text, '');
        } catch (Throwable) {
            // L'alerte ne doit jamais provoquer une seconde erreur
        }
    }
}
