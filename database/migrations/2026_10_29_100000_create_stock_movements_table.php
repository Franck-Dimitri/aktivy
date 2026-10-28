<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des mouvements de stock d'un produit sur un site : chaque changement du stock
 * (réassort, vente, inventaire, correction d'un rapport) laisse une trace, avec le stock obtenu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_product_id')->constrained()->cascadeOnDelete();

            // initial | restock | sale | adjustment | correction
            $table->string('type', 20);

            // Variation réellement appliquée (négative pour une sortie) et stock obtenu
            $table->integer('quantity');
            $table->unsignedInteger('stock_after');

            $table->foreignId('daily_report_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->index(['site_product_id', 'created_at']);
            $table->index(['site_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
