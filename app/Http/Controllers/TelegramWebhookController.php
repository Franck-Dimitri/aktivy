<?php

namespace App\Http\Controllers;

use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __construct(private TelegramService $telegram) {}

    public function handle(Request $request): Response
    {
        // Verify Telegram secret token (refusé si aucun secret n'est configuré)
        $expected = (string) config('services.telegram.webhook_secret');
        $secret = (string) $request->header('X-Telegram-Bot-Api-Secret-Token');
        if ($expected === '' || ! hash_equals($expected, $secret)) {
            return response('Unauthorized', 401);
        }

        $update = $request->json()->all();

        if (!isset($update['message']['text'])) {
            return response('OK');
        }

        $message = $update['message'];
        $chatId  = $message['chat']['id'];
        $userId  = (string) $message['from']['id'];
        $text    = trim($message['text']);

        // Check authorization : sans liste blanche, personne n'a accès (/backup envoie la base entière)
        $allowed = array_filter(array_map('trim', explode(',', (string) config('services.telegram.allowed_ids', ''))));
        if (!in_array($userId, $allowed, true)) {
            $this->telegram->sendMessage($chatId, '⛔ Accès non autorisé.');
            return response('OK');
        }

        // Strip @BotName suffix if present (group chats)
        $command = strtolower(explode('@', explode(' ', $text)[0])[0]);

        match ($command) {
            '/start', '/aide', '/help' => $this->handleStart($chatId),
            '/status'                  => $this->handleStatus($chatId),
            '/stats'                   => $this->handleStats($chatId),
            '/backup'                  => $this->handleBackup($chatId),
            '/logs'                    => $this->handleLogs($chatId),
            '/ping'                    => $this->telegram->sendMessage($chatId, '🟢 Pong ! Bot opérationnel.'),
            default                    => $this->telegram->sendMessage($chatId, "❓ Commande inconnue. Tapez /aide."),
        };

        return response('OK');
    }

    // ── Handlers ──────────────────────────────────────────────────────

    private function handleStart(int|string $chatId): void
    {
        $msg  = "🤖 *Bot Supervision Motriks*\n\n";
        $msg .= "Commandes disponibles :\n";
        $msg .= "• /status — Santé de l'application\n";
        $msg .= "• /stats — Statistiques d'utilisation\n";
        $msg .= "• /backup — Sauvegarde manuelle de la BD\n";
        $msg .= "• /logs — 10 dernières erreurs du log\n";
        $msg .= "• /ping — Vérifier que le bot répond\n";
        $this->telegram->sendMessage($chatId, $msg);
    }

    private function handleStatus(int|string $chatId): void
    {
        $this->telegram->sendMessage($chatId, $this->telegram->buildStatusMessage());
    }

    private function handleStats(int|string $chatId): void
    {
        $this->telegram->sendMessage($chatId, $this->telegram->buildStatsMessage());
    }

    private function handleBackup(int|string $chatId): void
    {
        $this->telegram->sendMessage($chatId, '⏳ Sauvegarde en cours...');

        try {
            Artisan::call('db:backup', ['--notify-chat' => (string) $chatId]);
        } catch (\Throwable $e) {
            Log::error('Telegram backup command failed', ['error' => $e->getMessage()]);
            $this->telegram->sendMessage($chatId, "❌ Erreur inattendue : " . $e->getMessage());
        }
    }

    private function handleLogs(int|string $chatId): void
    {
        $logPath = storage_path('logs/laravel.log');

        if (!file_exists($logPath)) {
            $this->telegram->sendMessage($chatId, '📭 Aucun fichier de log trouvé.');
            return;
        }

        // Read last 200 lines, keep only ERROR / CRITICAL
        $handle = fopen($logPath, 'r');
        $lines  = [];
        while (!feof($handle)) {
            $lines[] = fgets($handle);
            if (count($lines) > 200) array_shift($lines);
        }
        fclose($handle);

        $errors = array_values(array_filter(
            $lines,
            fn ($l) => str_contains($l, '.ERROR') || str_contains($l, '.CRITICAL'),
        ));
        $errors = array_slice($errors, -10);

        if (empty($errors)) {
            $this->telegram->sendMessage($chatId, '✅ Aucune erreur récente dans les logs.');
            return;
        }

        $msg = "🔴 *Dernières erreurs*\n\n```\n";
        foreach ($errors as $line) {
            // Keep date + message, truncate long lines
            $clean = substr(preg_replace('/\s+/', ' ', trim($line)), 0, 220);
            $msg .= $clean . "\n";
        }
        $msg .= "```";

        $this->telegram->sendMessage($chatId, $msg);
    }
}
