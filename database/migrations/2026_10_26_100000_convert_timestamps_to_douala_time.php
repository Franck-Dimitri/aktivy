<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * L'application passe de UTC à l'heure de Douala (UTC+1, sans heure d'été).
 *
 * Les colonnes « timestamp » ne stockent pas de fuseau : elles sont lues dans celui de
 * l'application. Les dates déjà enregistrées en UTC sont donc avancées d'une heure pour
 * rester exactes une fois lues à l'heure de Douala.
 *
 * À lancer juste après la mise en cache de la nouvelle configuration, application en maintenance :
 *   php artisan down && php artisan config:cache && php artisan migrate --force && php artisan up
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->shift('+');
    }

    public function down(): void
    {
        $this->shift('-');
    }

    private function shift(string $direction): void
    {
        // Les tests (SQLite) partent d'une base vide : rien à convertir
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Garde-fou : décaler les dates sans que l'application ait changé de fuseau les fausserait d'une heure
        if ($direction === '+' && config('app.timezone') !== 'Africa/Douala') {
            throw new RuntimeException("Le fuseau de l'application doit être Africa/Douala : lancez « php artisan config:cache » avant cette migration.");
        }

        $columns = DB::select("
            select table_name, column_name
            from information_schema.columns
            where table_schema = current_schema()
              and data_type = 'timestamp without time zone'
        ");

        foreach ($columns as $column) {
            $table = '"'.$column->table_name.'"';
            $col = '"'.$column->column_name.'"';

            DB::statement("update {$table} set {$col} = {$col} {$direction} interval '1 hour' where {$col} is not null");
        }
    }
};
