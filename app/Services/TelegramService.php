<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

class TelegramService
{
    private string $apiBase;

    public function __construct()
    {
        $token = config('services.telegram.bot_token');
        $this->apiBase = "https://api.telegram.org/bot{$token}";
    }

    public function sendMessage(string|int $chatId, string $text, string $parseMode = 'Markdown'): void
    {
        try {
            Http::timeout(10)->post("{$this->apiBase}/sendMessage", [
                'chat_id'                  => $chatId,
                'text'                     => $text,
                'parse_mode'               => $parseMode,
                'disable_web_page_preview' => true,
            ]);
        } catch (Throwable) {
            // Absorb: supervision bot must never crash the app
        }
    }

    public function sendDocument(string|int $chatId, string $filePath, string $caption = ''): bool
    {
        $maxBytes = 50 * 1024 * 1024; // Telegram bot limit: 50 MB

        if (!file_exists($filePath) || filesize($filePath) > $maxBytes) {
            $size = file_exists($filePath) ? round(filesize($filePath) / 1024 / 1024, 1) . ' Mo' : 'introuvable';
            $this->sendMessage($chatId, "⚠️ Fichier non envoyé ({$size}) — limite Telegram 50 Mo dépassée.\nFichier disponible localement : `" . basename($filePath) . "`");
            return false;
        }

        try {
            Http::timeout(120)
                ->attach('document', file_get_contents($filePath), basename($filePath))
                ->post("{$this->apiBase}/sendDocument", [
                    'chat_id' => $chatId,
                    'caption' => $caption,
                    'parse_mode' => 'Markdown',
                ]);
            return true;
        } catch (Throwable $e) {
            $this->sendMessage($chatId, "❌ Erreur envoi fichier : " . $e->getMessage());
            return false;
        }
    }

    public function setWebhook(string $url, string $secret): array
    {
        return Http::post("{$this->apiBase}/setWebhook", [
            'url'          => $url,
            'secret_token' => $secret,
            'allowed_updates' => ['message'],
        ])->json();
    }

    public function deleteWebhook(): array
    {
        return Http::post("{$this->apiBase}/deleteWebhook")->json();
    }

    // ── Message builders ───────────────────────────────────────────────

    public function buildStatusMessage(): string
    {
        $dbOk = true;
        try { DB::select('SELECT 1'); } catch (Throwable) { $dbOk = false; }

        $cacheOk = true;
        try {
            Cache::put('tg_health_check', 1, 5);
            $cacheOk = Cache::get('tg_health_check') === 1;
        } catch (Throwable) { $cacheOk = false; }

        $diskFree  = disk_free_space('/');
        $diskTotal = disk_total_space('/');
        $diskPct   = $diskTotal > 0 ? round((1 - $diskFree / $diskTotal) * 100) : 0;
        $diskAlert = $diskPct >= 85 ? '⚠️' : '✅';

        $memMb   = round(memory_get_usage(true) / 1024 / 1024, 1);
        $env     = app()->environment();
        $version = app()->version();
        $now     = now()->format('d/m/Y H:i:s');

        $queueSize = 0;
        try {
            $queueSize = (int) DB::table('jobs')->count();
        } catch (Throwable) {}

        $msg  = "📊 *Statut Motriks* — `{$now}`\n\n";
        $msg .= ($dbOk    ? '✅' : '❌') . " Base de données\n";
        $msg .= ($cacheOk ? '✅' : '❌') . " Cache\n";
        $msg .= "{$diskAlert} Disque : `{$diskPct}%` utilisé\n";
        $msg .= "🧠 Mémoire PHP : `{$memMb} Mo`\n";
        if ($queueSize > 0) {
            $msg .= "⏳ Jobs en attente : `{$queueSize}`\n";
        }
        $msg .= "\n🌍 Env : `{$env}` — Laravel `{$version}`";

        return $msg;
    }

    public function buildStatsMessage(): string
    {
        $companies    = \App\Models\Company::count();
        $users        = \App\Models\User::count();
        $events       = \App\Models\Event::count();
        $eventsActive = \App\Models\Event::where('status', 'active')->count();
        $reports      = \App\Models\DailyReport::where('status', 'submitted')->count();
        $reportsToday = \App\Models\DailyReport::where('status', 'submitted')
            ->whereDate('report_date', today())->count();

        $msg  = "📈 *Statistiques Motriks* — " . now()->format('d/m/Y') . "\n\n";
        $msg .= "🏢 Entreprises : *{$companies}*\n";
        $msg .= "👤 Utilisateurs : *{$users}*\n";
        $msg .= "🎪 Événements : *{$events}*";
        if ($eventsActive > 0) {
            $msg .= " _(dont *{$eventsActive}* actifs)_";
        }
        $msg .= "\n";
        $msg .= "📋 Rapports soumis (total) : *{$reports}*\n";
        $msg .= "📋 Rapports aujourd'hui : *{$reportsToday}*\n";

        return $msg;
    }
}
