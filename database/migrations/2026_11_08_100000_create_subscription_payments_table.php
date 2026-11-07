<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paiements d'abonnement reçus hors ligne (Mobile Money, virement, espèces), enregistrés par
 * le super administrateur. Chacun porte un numéro de facture unique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number', 30)->unique();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3)->default('XAF');
            $table->string('method', 30);
            $table->string('reference', 120)->nullable();
            $table->date('paid_at');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->json('modules')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
