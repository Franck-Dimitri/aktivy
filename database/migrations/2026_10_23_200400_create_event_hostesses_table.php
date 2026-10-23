<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_hostesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('event_site_id')->nullable()->constrained('event_sites')->nullOnDelete();

            // true = compte créé spécialement pour l'event → archivé à la clôture
            $table->boolean('recruited_for_event')->default(false);

            $table->string('status')->default('active');

            $table->timestamps();

            // Une hôtesse ne peut être qu'une fois par event
            $table->unique(['event_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_hostesses');
    }
};
