<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('affectation_id')->nullable()->constrained()->nullOnDelete();

            // Pointage
            $table->timestamp('checked_in_at');
            $table->timestamp('checked_out_at')->nullable();

            // GPS à l'entrée
            $table->decimal('checkin_latitude', 10, 7)->nullable();
            $table->decimal('checkin_longitude', 10, 7)->nullable();

            // GPS à la sortie
            $table->decimal('checkout_latitude', 10, 7)->nullable();
            $table->decimal('checkout_longitude', 10, 7)->nullable();

            // Durée calculée à la sortie (minutes), null si pas encore parti
            $table->unsignedSmallInteger('duration_minutes')->nullable();

            $table->string('status')->default('in_progress')->index(); // VisitStatus enum
            $table->text('notes')->nullable();

            $table->timestamps();

            // "Qui est sur le terrain en ce moment ?"
            $table->index(['company_id', 'status', 'checked_in_at']);
            // Historique par site
            $table->index(['site_id', 'checked_in_at']);
            // Historique par agent
            $table->index(['user_id', 'checked_in_at']);
        });

        // Contrainte : une seule visite active par agent à la fois
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                CREATE UNIQUE INDEX visits_one_active_per_user
                ON visits (user_id)
                WHERE status = 'in_progress'
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS visits_one_active_per_user');
        }

        Schema::dropIfExists('visits');
    }
};
