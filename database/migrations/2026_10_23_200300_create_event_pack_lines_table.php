<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_pack_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_pack_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();

            $table->unsignedSmallInteger('quantity')->default(1);

            // paid = produit à payer, free = produit offert (buy_get_free)
            $table->string('role')->default('paid');

            // Prix unitaire dans le pack (override du prix normal)
            $table->unsignedInteger('unit_price')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_pack_lines');
    }
};
