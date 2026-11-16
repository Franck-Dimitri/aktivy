<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

/**
 * Vérifie chaque semaine que les dernières sauvegardes se relisent vraiment : déchiffrement avec la
 * phrase secrète, décompression complète, début de dump PostgreSQL attendu, archive de fichiers lisible.
 * Une sauvegarde qu'on ne sait pas relire ne vaut rien : on le découvre ici, pas le jour d'un incident.
 * (La restauration complète, sur une base de test, reste à faire régulièrement à la main : README.)
 */
class BackupVerifyCommand extends Command
{
    protected $signature = 'backup:verify';

    protected $description = 'Vérifie que les dernières sauvegardes se déchiffrent et se relisent';

    public function handle(TelegramService $telegram): int
    {
        $passphrase = (string) config('services.backup.passphrase');
        $dir = storage_path('backups');
        $problems = [];

        $database = $this->latest($dir.'/motriks_*.sql.gz.enc');
        $files = $this->latest($dir.'/motriks_fichiers_*.tar.gz.enc');

        if ($passphrase === '') {
            $problems[] = 'BACKUP_PASSPHRASE manquante';
        } else {
            if ($database === null) {
                $problems[] = 'aucune sauvegarde de la base';
            } else {
                // Déchiffre et décompresse tout le dump (gzip vérifie son intégrité jusqu'au bout)
                $check = $this->pipe('openssl enc -d -aes-256-cbc -pbkdf2 -in "$FILE" -pass env:BACKUP_PASSPHRASE | gunzip -c | head -c 300', $database, $passphrase);
                if (! str_contains($check, 'PostgreSQL database dump')) {
                    $problems[] = 'sauvegarde de la base illisible ('.basename($database).')';
                }
            }

            if ($files === null) {
                $problems[] = 'aucune sauvegarde des fichiers';
            } else {
                $check = $this->pipe('openssl enc -d -aes-256-cbc -pbkdf2 -in "$FILE" -pass env:BACKUP_PASSPHRASE | tar -tzf - > /dev/null && echo ARCHIVE_OK', $files, $passphrase);
                if (! str_contains($check, 'ARCHIVE_OK')) {
                    $problems[] = 'sauvegarde des fichiers illisible ('.basename($files).')';
                }
            }
        }

        foreach ([$database, $files] as $path) {
            if ($path !== null && filemtime($path) < now()->subDays(2)->getTimestamp()) {
                $problems[] = basename($path).' date de plus de 2 jours';
            }
        }

        $chatId = config('services.telegram.chat_id');

        if ($problems !== []) {
            $this->error('Sauvegardes : '.implode(' ; ', $problems).'.');
            if ($chatId) {
                $telegram->sendMessage($chatId, '❌ Vérification des sauvegardes : '.implode(' ; ', $problems).'.', '');
            }

            return self::FAILURE;
        }

        $this->info('Sauvegardes vérifiées : base et fichiers se relisent.');

        return self::SUCCESS;
    }

    private function latest(string $pattern): ?string
    {
        $found = glob($pattern) ?: [];
        rsort($found);

        return $found[0] ?? null;
    }

    /** Le chemin et la phrase passent par l'environnement, jamais dans la commande elle-même. */
    private function pipe(string $script, string $file, string $passphrase): string
    {
        return Process::env(['FILE' => $file, 'BACKUP_PASSPHRASE' => $passphrase])
            ->timeout(1800)
            ->run(['sh', '-c', $script])
            ->output();
    }
}
