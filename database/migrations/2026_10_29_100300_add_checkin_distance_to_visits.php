<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Distance, en mètres, entre la position de l'hôtesse à la prise de service et le site.
 * Vide si l'hôtesse n'a pas partagé sa position ou si le site n'a pas de coordonnées.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->unsignedInteger('checkin_distance_m')->nullable()->after('checkin_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn('checkin_distance_m');
        });
    }
};
