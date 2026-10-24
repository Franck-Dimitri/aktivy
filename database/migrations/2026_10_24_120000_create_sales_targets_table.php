<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Objectif d'un site ; null = objectif global de l'entreprise
            $table->foreignId('site_id')->nullable()->constrained()->cascadeOnDelete();

            // Premier jour du mois visé
            $table->date('month');

            // Chiffre d'affaires visé, dans la devise de l'entreprise
            $table->unsignedBigInteger('amount');

            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_targets');
    }
};
