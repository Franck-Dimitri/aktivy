<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;

class DatabaseBackupCommand extends Command
{
    protected $signature = 'db:backup
                            {--notify-chat= : Chat Telegram à notifier (optionnel, utilise TELEGRAM_CHAT_ID par défaut)}';

    protected $description = 'Sauvegarde PostgreSQL compressée et envoi optionnel via Telegram';

    public function handle(TelegramService $telegram): int
    {
        $chatId = $this->option('notify-chat') ?? config('services.telegram.chat_id');

        $db       = config('database.connections.pgsql.database');
        $host     = config('database.connections.pgsql.host', '127.0.0.1');
        $port     = config('database.connections.pgsql.port', 5432);
        $user     = config('database.connections.pgsql.username');
        $password = config('database.connections.pgsql.password');

        $backupDir = storage_path('backups');
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $filename = 'motriks_' . now()->format('Y-m-d_H-i-s') . '.sql.gz';
        $filepath = $backupDir . '/' . $filename;

        // pg_dump piped through gzip
        $command = sprintf(
            'PGPASSWORD=%s pg_dump -h %s -p %s -U %s --no-password %s | gzip > %s 2>&1',
            escapeshellarg($password),
            escapeshellarg($host),
            escapeshellarg((string) $port),
            escapeshellarg($user),
            escapeshellarg($db),
            escapeshellarg($filepath),
        );

        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || !file_exists($filepath) || filesize($filepath) === 0) {
            $this->error("Backup failed (exit {$exitCode}).");
            if ($chatId) {
                $telegram->sendMessage($chatId, "❌ *Backup échoué !*\nExit code `{$exitCode}`\n" . implode("\n", $output));
            }
            return self::FAILURE;
        }

        $sizeKo  = round(filesize($filepath) / 1024, 1);
        $caption = "💾 *Sauvegarde Motriks*\n📅 " . now()->format('d/m/Y à H:i') . "\n📦 `{$filename}`\n⚖️ {$sizeKo} Ko";

        $this->info("Backup created: {$filename} ({$sizeKo} Ko)");

        if ($chatId) {
            $telegram->sendDocument((int) $chatId, $filepath, $caption);
        }

        $this->pruneOldBackups($backupDir);

        return self::SUCCESS;
    }

    private function pruneOldBackups(string $dir): void
    {
        $files = glob($dir . '/motriks_*.sql.gz') ?: [];
        rsort($files); // newest first
        foreach (array_slice($files, 10) as $old) {
            unlink($old);
        }
    }
}
