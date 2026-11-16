<?php

namespace App\Support\Backup;

use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Copie d'une sauvegarde hors du serveur : sur le disque désigné par BACKUP_DISK (config/filesystems.php,
 * par exemple un stockage objet S3 ou un serveur SFTP chez un autre hébergeur). Sans lui, les sauvegardes
 * ne quittent le serveur que par Telegram (base seulement, 50 Mo au plus) : perdre le serveur ferait
 * perdre les pièces d'identité et les photos.
 */
final class Offsite
{
    public static function configured(): bool
    {
        return filled(config('services.backup.disk'));
    }

    /** null si la copie a réussi (ou s'il n'y a pas de disque hors serveur), sinon la raison de l'échec. */
    public static function copy(string $path): ?string
    {
        if (! self::configured()) {
            return null;
        }

        try {
            $stream = fopen($path, 'rb');
            if ($stream === false) {
                return 'copie hors serveur impossible (sauvegarde illisible)';
            }

            $ok = Storage::disk((string) config('services.backup.disk'))->writeStream('motriks/'.basename($path), $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }

            return $ok ? null : 'copie hors serveur refusée';
        } catch (Throwable $e) {
            return 'copie hors serveur impossible ('.class_basename($e).')';
        }
    }
}
