<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('visit_id')->unique()->constrained()->cascadeOnDelete();

            $table->date('report_date')->index();
            $table->string('status')->default('draft'); // draft | submitted

            // Notes libres + signalement d'incident
            $table->text('notes')->nullable();
            $table->text('incident_notes')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            // Une seule soumission par hôtesse par jour
            $table->unique(['user_id', 'report_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
