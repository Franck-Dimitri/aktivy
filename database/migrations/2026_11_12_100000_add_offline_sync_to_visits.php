<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mode hors ligne de l'hôtesse : un pointage fait sans réseau garde l'heure du téléphone ;
 * l'heure de réception par le serveur est notée à côté, pour le responsable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->timestamp('checkin_synced_at')->nullable()->after('checkin_accuracy_m');
            $table->timestamp('checkout_synced_at')->nullable()->after('checkout_longitude');
        });

        Schema::table('daily_reports', function (Blueprint $table) {
            $table->timestamp('submit_synced_at')->nullable()->after('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn(['checkin_synced_at', 'checkout_synced_at']);
        });

        Schema::table('daily_reports', function (Blueprint $table) {
            $table->dropColumn('submit_synced_at');
        });
    }
};
