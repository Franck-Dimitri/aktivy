<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Identifiants publics (UUID) dans les adresses, à la place des numéros : /sites/0193…-…, plus /sites/3.
 * Les numéros ne disent plus combien d'entreprises, de rapports ou d'utilisateurs existent, et ne se devinent pas.
 *
 * La clé primaire numérique reste la même (relations, index, exports) : seule la clé de route change
 * (trait App\Models\Concerns\HasPublicUuid). Les lignes existantes reçoivent un UUID, puis la colonne
 * devient obligatoire et unique. Les liens des notifications déjà enregistrées sont convertis.
 */
return new class extends Migration
{
    /** Tables dont l'identifiant apparaît dans une adresse. */
    private const TABLES = [
        'companies', 'users', 'sites', 'visits', 'daily_reports', 'affectations', 'products', 'site_products',
        'events', 'event_sites', 'event_packs', 'event_hostesses', 'subscription_payments', 'support_requests',
        'tickets', 'staff_documents', 'daily_report_photos', 'data_exports',
    ];

    /** Liens des notifications enregistrées : motif de l'adresse => table de l'identifiant. */
    private const NOTIFICATION_LINKS = [
        '#/rapports-journaliers/(\d+)#' => ['/rapports-journaliers/', 'daily_reports'],
        '#/admin/onboarding/(\d+)#' => ['/admin/onboarding/', 'companies'],
        '#/admin/entreprises/(\d+)#' => ['/admin/entreprises/', 'companies'],
        '#/admin/support/(\d+)#' => ['/admin/support/', 'support_requests'],
        '#/terrain/rapport/(\d+)#' => ['/terrain/rapport/', 'visits'],
        '#/events/(\d+)#' => ['/events/', 'events'],
        '#/sites/(\d+)#' => ['/sites/', 'sites'],
        '#/personnel/(\d+)#' => ['/personnel/', 'users'],
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, 'uuid')) {
                continue;
            }

            Schema::table($table, fn (Blueprint $t) => $t->uuid('uuid')->nullable()->after('id'));

            // Par lots, pour ne pas charger une grande table en mémoire
            DB::table($table)->whereNull('uuid')->orderBy('id')->select('id')->chunkById(500, function ($rows) use ($table) {
                foreach ($rows as $row) {
                    DB::table($table)->where('id', $row->id)->update(['uuid' => (string) Str::uuid7()]);
                }
            });

            Schema::table($table, function (Blueprint $t) {
                $t->uuid('uuid')->nullable(false)->change();
                $t->unique('uuid');
            });
        }

        $this->convertNotificationLinks();
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'uuid')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropUnique(['uuid']);
                    $t->dropColumn('uuid');
                });
            }
        }
    }

    /** Les notifications déjà reçues s'ouvrent toujours : leur lien passe du numéro à l'UUID. */
    private function convertNotificationLinks(): void
    {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        DB::table('notifications')->orderBy('id')->chunk(500, function ($notifications) {
            foreach ($notifications as $notification) {
                $data = json_decode((string) $notification->data, true);
                $url = $data['url'] ?? null;
                if (! is_string($url) || ! preg_match('/\d/', $url)) {
                    continue;
                }

                foreach (self::NOTIFICATION_LINKS as $pattern => [$prefix, $table]) {
                    $url = preg_replace_callback($pattern, function (array $m) use ($prefix, $table) {
                        $uuid = DB::table($table)->where('id', (int) $m[1])->value('uuid');

                        return $uuid ? $prefix.$uuid : $m[0];
                    }, $url);
                }

                if ($url !== $data['url']) {
                    $data['url'] = $url;
                    DB::table('notifications')->where('id', $notification->id)->update(['data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
                }
            }
        });
    }
};
