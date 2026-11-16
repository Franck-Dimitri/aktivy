<?php

namespace App\Support\Traffic;

use MaxMind\Db\Reader;
use Throwable;

/**
 * Pays d'une adresse IP, lu dans la base « IP to Country Lite » de DB-IP (db-ip.com, licence CC BY 4.0),
 * téléchargée sur le serveur par la commande geoip:update. Aucune requête vers un service extérieur :
 * l'adresse IP ne quitte pas le serveur et n'est jamais enregistrée, seul le code pays l'est.
 */
class GeoIp
{
    private ?Reader $reader = null;

    private bool $opened = false;

    public static function path(): string
    {
        return storage_path('app/geoip/dbip-country-lite.mmdb');
    }

    /** Code pays ISO à deux lettres (« CM »), ou null : adresse locale, base absente ou pays inconnu. */
    public function country(?string $ip): ?string
    {
        if ($ip === null || ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return null;
        }

        $reader = $this->reader();
        if ($reader === null) {
            return null;
        }

        try {
            $code = strtoupper((string) ($reader->get($ip)['country']['iso_code'] ?? ''));
        } catch (Throwable) {
            return null;
        }

        return preg_match('/^[A-Z]{2}$/', $code) ? $code : null;
    }

    private function reader(): ?Reader
    {
        if (! $this->opened) {
            $this->opened = true;

            try {
                $this->reader = is_file(self::path()) ? new Reader(self::path()) : null;
            } catch (Throwable) {
                $this->reader = null;
            }
        }

        return $this->reader;
    }
}
