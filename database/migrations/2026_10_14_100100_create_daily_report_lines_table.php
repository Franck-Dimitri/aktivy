<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_report_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_product_id')->constrained()->restrictOnDelete();

            // Snapshot produit au moment de la soumission
            $table->string('product_name');
            $table->string('unit');
            $table->decimal('unit_price', 12, 2)->default(0);

            // Stock d'ouverture = current_stock du site au moment du check-in
            $table->integer('opening_stock')->default(0);

            // Saisi par l'hôtesse
            $table->integer('units_sold')->default(0);

            // Calculé lors de la soumission : opening_stock - units_sold
            $table->integer('closing_stock')->default(0);

            // Calculé lors de la soumission : units_sold * unit_price
            $table->decimal('revenue', 14, 2)->default(0);

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['daily_report_id', 'site_product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_lines');
    }
};
