<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Index manquants relevés par l'audit de performance (novembre 2026).
 *
 * PostgreSQL ne crée pas d'index sur les clés étrangères : les pages Rapports, fiche site et le
 * « pouls » des notifications (toutes les 20 s) lisaient des tables entières. Chaque index n'est créé
 * que s'il n'existe pas déjà : la migration passe sur toute base, même partiellement indexée.
 */
return new class extends Migration
{
    /** @var array<string, list<list<string>>> table => colonnes de chaque index */
    private const INDEXES = [
        // Pages Rapports, Objectifs, fiche site : filtrées par entreprise ou site, sur une période
        'daily_reports' => [['company_id', 'report_date'], ['site_id', 'report_date'], ['event_id']],
        'daily_report_lines' => [['site_product_id'], ['product_id']],
        'daily_report_photos' => [['daily_report_id']],
        // Cloche et « pouls » : dernières notifications d'un compte
        'notifications' => [['notifiable_type', 'notifiable_id', 'created_at']],
        'audit_logs' => [['company_id', 'created_at'], ['user_id']],
        'users' => [['company_id']],
        'visits' => [['affectation_id']],
        'stock_movements' => [['company_id'], ['daily_report_id'], ['user_id']],
        'tickets' => [['company_id', 'created_at'], ['user_id']],
        'reminder_logs' => [['company_id'], ['sent_at']],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($indexes as $columns) {
                if (! Schema::hasColumns($table, $columns) || Schema::hasIndex($table, $columns)) {
                    continue;
                }

                Schema::table($table, fn (Blueprint $t) => $t->index($columns, $this->name($table, $columns)));
            }
        }

        // Compteur des non lues : index partiel (PostgreSQL), petit et toujours à jour
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (notifiable_type, notifiable_id) WHERE read_at IS NULL');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS notifications_unread_idx');
        }

        foreach (self::INDEXES as $table => $indexes) {
            foreach ($indexes as $columns) {
                $name = $this->name($table, $columns);

                if (Schema::hasTable($table) && Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $t) => $t->dropIndex($name));
                }
            }
        }
    }

    /**
     * Nom explicite et stable, pour pouvoir le retirer dans down().
     *
     * @param  list<string>  $columns
     */
    private function name(string $table, array $columns): string
    {
        return $table.'_'.implode('_', $columns).'_perf_idx';
    }
};
