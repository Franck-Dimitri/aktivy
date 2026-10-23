<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;

class TelegramSetWebhookCommand extends Command
{
    protected $signature = 'telegram:set-webhook {--delete : Supprimer le webhook au lieu de le créer}';

    protected $description = 'Configure ou supprime le webhook Telegram du bot';

    public function handle(TelegramService $telegram): int
    {
        if ($this->option('delete')) {
            $result = $telegram->deleteWebhook();
            if ($result['ok'] ?? false) {
                $this->info('Webhook supprimé.');
            } else {
                $this->error('Échec : ' . ($result['description'] ?? 'Erreur inconnue'));
                return self::FAILURE;
            }
            return self::SUCCESS;
        }

        $url    = rtrim(config('app.url'), '/') . '/telegram/webhook';
        $secret = config('services.telegram.webhook_secret');

        if (empty($secret)) {
            $this->error('TELEGRAM_WEBHOOK_SECRET n\'est pas défini dans .env');
            return self::FAILURE;
        }

        $result = $telegram->setWebhook($url, $secret);

        if ($result['ok'] ?? false) {
            $this->info("Webhook configuré : {$url}");
        } else {
            $this->error('Échec : ' . ($result['description'] ?? 'Erreur inconnue'));
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
