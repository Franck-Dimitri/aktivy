<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vues des pages publiques du site (landing, contact, pages légales, connexion…), pour le volet
 * « Trafic du site » du journal d'audit. Mesure sans cookie : aucune adresse IP n'est conservée,
 * le visiteur est un empreinte anonyme qui change chaque jour. Purgée après 13 mois (model:prune).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('path', 255);
            // Domaine du site d'origine seulement (jamais l'adresse complète), null = accès direct
            $table->string('referrer_host', 120)->nullable();
            $table->string('utm_source', 80)->nullable();
            $table->string('utm_medium', 80)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            // mobile | tablet | desktop
            $table->string('device', 10);
            $table->string('browser', 40);
            $table->string('os', 40);
            $table->string('language', 8)->nullable();
            $table->char('country', 2)->nullable();
            // Empreinte anonyme : sha256(clé de l'application + jour + IP + navigateur), tronquée
            $table->char('visitor', 16);
            $table->timestamp('viewed_at');

            $table->index('viewed_at');
            $table->index(['viewed_at', 'visitor']);
            $table->index(['path', 'viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
