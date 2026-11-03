<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Objectifs hebdomadaires de chiffre d'affaires par hôtesse, facultatifs.
 * Une semaine va du lundi au dimanche ; week_start est le lundi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('week_start');
            // Chiffre d'affaires visé, dans la devise de l'entreprise
            $table->unsignedBigInteger('amount');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'week_start']);
            $table->index(['company_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_targets');
    }
};
