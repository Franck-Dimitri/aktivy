<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La colonne `status` était un enum (contrainte CHECK : open, in_review, closed).
     * On la passe en string pour accepter aussi `cancelled`.
     */
    public function up(): void
    {
        // PostgreSQL garde la contrainte CHECK après un change() : on la retire explicitement.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check');
        }

        Schema::table('tickets', function (Blueprint $table) {
            $table->string('status', 20)->default('open')->change();
        });
    }

    public function down(): void
    {
        // On ne recrée pas l'enum : des tickets `cancelled` pourraient exister.
    }
};
