<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Objectifs mensuels par hôtesse : un objectif porte désormais sur l'entreprise (site_id et
 * user_id vides), sur un site (site_id) ou sur une hôtesse (user_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_targets', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('site_id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales_targets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
