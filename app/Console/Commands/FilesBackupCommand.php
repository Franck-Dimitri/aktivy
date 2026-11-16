<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use App\Support\Backup\Offsite;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

/**
 * Sauvegarde des fichiers déposés (pièces d'identité, documents du personnel et des entreprises,
 * photos de rapports et de sites, logos) : archive compressée, chiffrée, copiée hors du serveur.
 * La base seule (db:backup) ne suffit pas : sans ces fichiers, les dossiers et les preuves sont perdus.
 *
 * Pour relire une archive :
 *   openssl enc -d -aes-256-cbc -pbkdf2 -in fichiers.tar.gz.enc -pass env:BACKUP_PASSPHRASE | tar -xz
 */
class FilesBackupCommand extends Command
{
    protected $signature = 'files:backup';

    protected $description = 'Sauvegarde chiffrée des fichiers déposés, copiée hors du serveur';

    /** Archives gardées sur le serveur (les plus récentes). */
    private const KEEP = 3;

    public function handle(TelegramService $telegram): int
    {
        $chatId = config('services.telegram.chat_id');
        $passphrase = (string) config('services.backup.passphrase');

        // Pièces d'identité : jamais d'archive en clair
        if ($passphrase === '') {
            return $this->failBackup($telegram, $chatId, 'BACKUP_PASSPHRASE manquante, fichiers non sauvegardés');
        }

        $dir = storage_path('backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $archive = $dir.'/motriks_fichiers_'.now()->format('Y-m-d_H-i-s').'.tar.gz';

        // Dossier storage/app entier (disques « local » et « public »), sans les exports temporaires
        $tar = Process::timeout(1800)->path(storage_path('app'))->run([
            'tar', '--exclude=./private/exports', '-czf', $archive, '.',
        ]);

        if ($tar->failed() || ! file_exists($archive) || filesize($archive) === 0) {
            @unlink($archive);

            return $this->failBackup($telegram, $chatId, 'archive impossible (code '.$tar->exitCode().')');
        }

        $encrypted = Process::env(['BACKUP_PASSPHRASE' => $passphrase])->timeout(1800)->run([
            'openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-salt',
            '-in', $archive, '-out', $archive.'.enc', '-pass', 'env:BACKUP_PASSPHRASE',
        ]);
        @unlink($archive);

        if ($encrypted->failed() || ! file_exists($archive.'.enc')) {
            @unlink($archive.'.enc');

            return $this->failBackup($telegram, $chatId, 'chiffrement impossible');
        }

        $archive .= '.enc';
        $this->prune($dir);

        if (($error = Offsite::copy($archive)) !== null) {
            return $this->failBackup($telegram, $chatId, $error);
        }

        $sizeMo = round(filesize($archive) / 1048576, 1);
        $this->info('Fichiers sauvegardés : '.basename($archive)." ({$sizeMo} Mo)".(Offsite::configured() ? ', copie hors serveur faite' : ''));

        if (! Offsite::configured() && $chatId) {
            $telegram->sendMessage($chatId, '⚠️ Fichiers sauvegardés sur le serveur seulement : configurez BACKUP_DISK pour une copie hors serveur.', '');
        }

        return self::SUCCESS;
    }

    private function failBackup(TelegramService $telegram, int|string|null $chatId, string $reason): int
    {
        $this->error("Sauvegarde des fichiers : {$reason}.");

        if ($chatId) {
            $telegram->sendMessage($chatId, "❌ Sauvegarde des fichiers : {$reason}.", '');
        }

        return self::FAILURE;
    }

    private function prune(string $dir): void
    {
        $files = glob($dir.'/motriks_fichiers_*') ?: [];
        rsort($files);
        foreach (array_slice($files, self::KEEP) as $old) {
            unlink($old);
        }
    }
}
