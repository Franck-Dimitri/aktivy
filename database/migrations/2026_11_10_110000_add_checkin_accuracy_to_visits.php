<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Précision du GPS au moment de la prise de service (rayon en mètres annoncé par le téléphone) :
 * le responsable sait si la position affichée est fiable à 10 m ou à 2 km près.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->unsignedInteger('checkin_accuracy_m')->nullable()->after('checkin_distance_m');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn('checkin_accuracy_m');
        });
    }
};
