<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_sites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            // PDV existant OU nouveau créé pour l'event
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->string('name')->nullable();    // si nouveau PDV sans site existant
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_sites');
    }
};
