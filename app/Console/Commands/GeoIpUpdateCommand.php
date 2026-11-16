<?php

namespace App\Console\Commands;

use App\Support\Traffic\GeoIp;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use MaxMind\Db\Reader;
use Throwable;

/**
 * Télécharge la base « IP to Country Lite » de DB-IP (gratuite, licence CC BY 4.0, publiée chaque mois)
 * pour connaître le pays des visiteurs du site. Planifiée chaque mois ; la base en place n'est remplacée
 * que si la nouvelle s'ouvre et répond correctement.
 */
class GeoIpUpdateCommand extends Command
{
    protected $signature = 'geoip:update';

    protected $description = 'Met à jour la base de géolocalisation des pays (DB-IP Lite)';

    private const URL = 'https://download.db-ip.com/free/dbip-country-lite-%s.mmdb.gz';

    public function handle(): int
    {
        // La base du mois n'est publiée qu'après les premiers jours : on essaie aussi celle du mois précédent
        foreach ([now(), now()->subMonthNoOverflow()] as $month) {
            $url = sprintf(self::URL, $month->format('Y-m'));

            try {
                $response = Http::timeout(120)->get($url);
            } catch (Throwable $e) {
                $this->warn("Téléchargement impossible ({$url}) : {$e->getMessage()}");

                continue;
            }

            if (! $response->successful()) {
                continue;
            }

            $data = @gzdecode($response->body());
            if ($data === false) {
                $this->error("Fichier illisible : {$url}");

                return self::FAILURE;
            }

            $target = GeoIp::path();
            File::ensureDirectoryExists(dirname($target));
            $temporary = $target.'.download';
            File::put($temporary, $data);

            // Contrôle avant de remplacer : une adresse connue doit donner le bon pays
            try {
                $reader = new Reader($temporary);
                $check = $reader->get('8.8.8.8')['country']['iso_code'] ?? null;
                $reader->close();
            } catch (Throwable) {
                $check = null;
            }

            if ($check !== 'US') {
                File::delete($temporary);
                $this->error('La base téléchargée ne répond pas correctement : base actuelle conservée.');

                return self::FAILURE;
            }

            File::move($temporary, $target);
            $this->info('Base de géolocalisation à jour ('.$month->format('m/Y').', '.round(filesize($target) / 1048576, 1).' Mo).');

            return self::SUCCESS;
        }

        $this->error('Aucune base DB-IP disponible pour ce mois ni le précédent : base actuelle conservée.');

        return self::FAILURE;
    }
}
