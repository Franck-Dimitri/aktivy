<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

/**
 * Sauvegarde PostgreSQL compressée puis chiffrée, envoyée sur Telegram quand c'est configuré.
 *
 * Pour relire une sauvegarde :
 *   openssl enc -d -aes-256-cbc -pbkdf2 -in fichier.sql.gz.enc -pass env:BACKUP_PASSPHRASE | gunzip > base.sql
 */
class DatabaseBackupCommand extends Command
{
    protected $signature = 'db:backup
                            {--notify-chat= : Chat Telegram à notifier (optionnel, utilise TELEGRAM_CHAT_ID par défaut)}';

    protected $description = 'Sauvegarde PostgreSQL chiffrée et envoi via Telegram';

    public function handle(TelegramService $telegram): int
    {
        $chatId = $this->option('notify-chat') ?? config('services.telegram.chat_id');
        $passphrase = (string) config('services.backup.passphrase');
        $connection = config('database.connections.pgsql');

        $backupDir = storage_path('backups');
        if (! is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $filepath = $backupDir.'/motriks_'.now()->format('Y-m-d_H-i-s').'.sql.gz';

        // pg_dump compresse lui-même (-Z) : son code de sortie reflète bien l'échec du dump.
        // Le mot de passe passe par l'environnement, jamais par la ligne de commande.
        $dump = Process::env(['PGPASSWORD' => (string) $connection['password']])
            ->timeout(600)
            ->run([
                'pg_dump', '-h', (string) $connection['host'], '-p', (string) $connection['port'],
                '-U', (string) $connection['username'], '--no-password', '-Z', '6',
                (string) $connection['database'], '-f', $filepath,
            ]);

        if ($dump->failed() || ! file_exists($filepath) || filesize($filepath) === 0) {
            @unlink($filepath); // ne pas garder un dump partiel parmi les sauvegardes

            return $this->failBackup($telegram, $chatId, 'dump impossible (code '.$dump->exitCode().')');
        }

        if ($passphrase !== '') {
            $encrypted = Process::env(['BACKUP_PASSPHRASE' => $passphrase])->run([
                'openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-salt',
                '-in', $filepath, '-out', $filepath.'.enc', '-pass', 'env:BACKUP_PASSPHRASE',
            ]);
            $plain = $filepath;
            $filepath .= '.enc';

            if ($encrypted->failed() || ! file_exists($filepath)) {
                @unlink($filepath);
                @unlink($plain);

                return $this->failBackup($telegram, $chatId, 'chiffrement impossible');
            }

            unlink($plain);
        }

        $filename = basename($filepath);
        $sizeKo = round(filesize($filepath) / 1024, 1);
        $this->info("Backup created: {$filename} ({$sizeKo} Ko)");
        $this->pruneOldBackups($backupDir);

        if (! $chatId) {
            return self::SUCCESS;
        }

        // La base contient des données personnelles : jamais d'envoi en clair
        if ($passphrase === '') {
            return $this->failBackup($telegram, $chatId, 'BACKUP_PASSPHRASE manquante, sauvegarde non envoyée');
        }

        $caption = "💾 *Sauvegarde Motriks (chiffrée)*\n📅 ".now()->format('d/m/Y à H:i')."\n📦 `{$filename}`\n⚖️ {$sizeKo} Ko";

        if (! $telegram->sendDocument($chatId, $filepath, $caption)) {
            return $this->failBackup($telegram, $chatId, 'envoi Telegram refusé, fichier gardé sur le serveur');
        }

        return self::SUCCESS;
    }

    private function failBackup(TelegramService $telegram, int|string|null $chatId, string $reason): int
    {
        $this->error("Backup failed: {$reason}.");

        if ($chatId) {
            $telegram->sendMessage($chatId, "❌ Sauvegarde : {$reason}.", '');
        }

        return self::FAILURE;
    }

    private function pruneOldBackups(string $dir): void
    {
        $files = glob($dir.'/motriks_*.sql.gz*') ?: [];
        rsort($files); // les plus récents d'abord
        foreach (array_slice($files, 10) as $old) {
            unlink($old);
        }
    }
}
