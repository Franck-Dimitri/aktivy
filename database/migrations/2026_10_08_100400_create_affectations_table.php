<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affectations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();      // Hôtesse / agent terrain
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete(); // Superviseur / gérant

            // Période
            $table->date('starts_on');
            $table->date('ends_on')->nullable();   // null = affectation permanente

            // Créneau horaire quotidien (optionnel)
            $table->time('slot_start')->nullable();
            $table->time('slot_end')->nullable();

            $table->string('status')->default('active')->index();  // AffectationStatus enum
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['site_id', 'status']);
            $table->index(['user_id', 'status', 'starts_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affectations');
    }
};
