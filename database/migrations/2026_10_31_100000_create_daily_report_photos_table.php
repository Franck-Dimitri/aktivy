<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photos jointes par l'hôtesse à son rapport : stand, rayon, rupture… preuves pour le responsable
 * et la marque cliente. Les fichiers sont privés (disque local), servis après contrôle d'accès.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_report_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('caption', 200)->nullable();
            $table->unsignedInteger('size')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_photos');
    }
};
