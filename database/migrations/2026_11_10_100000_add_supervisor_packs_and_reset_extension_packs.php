<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Nouvelle grille des forfaits (10 novembre 2026).
 *
 * - Pack superviseur (+1 superviseur, 1 500 FCFA par mois), à côté du pack hôtesses
 *   (+5 hôtesses / +5 points de vente, désormais 11 500 FCFA par mois).
 * - Les packs souscrits à l'ancien tarif (6 500 FCFA) sont remis à zéro (décision du 10 novembre 2026) :
 *   l'administrateur ajoute les nouveaux packs à la main. Les paiements et factures déjà émis ne changent pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->unsignedSmallInteger('plan_supervisor_packs')->default(0)->after('plan_extra_packs');
        });

        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->unsignedSmallInteger('supervisor_packs')->default(0)->after('extra_packs');
        });

        DB::table('companies')->where('plan_extra_packs', '>', 0)->update(['plan_extra_packs' => 0]);
    }

    public function down(): void
    {
        // Les anciens packs remis à zéro ne sont pas restaurés
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropColumn('supervisor_packs');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('plan_supervisor_packs');
        });
    }
};
