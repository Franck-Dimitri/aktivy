<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rappels automatiques : la trace de chaque rappel envoyé (un même cas n'est jamais rappelé deux fois)
 * et les réglages de chaque entreprise (horaires, rappels activés).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
            // Identifiant du cas, ex. « shift-upcoming:affectation-12:2026-11-05 »
            $table->string('key', 191)->unique();
            $table->string('type', 50)->index();
            $table->timestamp('sent_at');
        });

        Schema::table('companies', function (Blueprint $table) {
            // null = réglages par défaut (cf. App\Support\Reminders\ReminderSettings)
            $table->json('reminder_settings')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_logs');
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('reminder_settings');
        });
    }
};
