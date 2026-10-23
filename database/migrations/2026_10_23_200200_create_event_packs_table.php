<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_packs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();

            // grouped_discount : bundle à prix réduit
            // buy_get_free     : produit acheté → produit offert
            $table->string('type')->default('grouped_discount');

            // Prix du bundle (pour grouped_discount)
            $table->unsignedInteger('price')->nullable();

            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['event_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_packs');
    }
};
