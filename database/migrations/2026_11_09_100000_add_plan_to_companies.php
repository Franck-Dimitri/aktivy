<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Forfaits Motriks (Starter, Pro, Business, Entreprise) à la place des modules activés un par un.
 *
 * Toutes les entreprises existantes passent en Motriks Starter (décision du 7 novembre 2026).
 * La table company_modules est conservée telle quelle pour l'historique : elle ne sert plus
 * à ouvrir les fonctions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('plan', 20)->default('starter')->after('status')->index();
            $table->date('plan_ends_on')->nullable()->after('plan');
            $table->boolean('plan_trial')->default(false)->after('plan_ends_on');
            $table->unsignedSmallInteger('plan_extra_packs')->default(0)->after('plan_trial');
        });

        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->string('plan', 20)->nullable()->after('method');
            $table->unsignedSmallInteger('extra_packs')->default(0)->after('plan');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropColumn(['plan', 'extra_packs']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex(['plan']);
            $table->dropColumn(['plan', 'plan_ends_on', 'plan_trial', 'plan_extra_packs']);
        });
    }
};
