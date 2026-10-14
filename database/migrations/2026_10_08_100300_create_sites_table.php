<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Identité
            $table->string('name');                           // "Santa Lucia Ngousso"
            $table->string('code', 30)->nullable();           // Code interne ex. "SL-NGO-01"
            $table->string('type')->default('autre');         // SiteType enum

            // Localisation
            $table->text('address')->nullable();
            $table->string('city', 100)->default('Yaoundé');
            $table->string('region', 100)->nullable();        // "Centre", "Littoral", …
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Contact sur place
            $table->string('contact_name', 150)->nullable();
            $table->string('contact_phone', 25)->nullable();

            // Horaires
            $table->json('opening_days')->nullable();         // [1,2,3,4,5] = Lun-Ven
            $table->time('opening_time')->nullable();
            $table->time('closing_time')->nullable();

            $table->text('notes')->nullable();
            $table->string('status')->default('active')->index();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            // Dénormalisé pour les requêtes de tableau de bord
            $table->timestamp('last_visit_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Un code est unique par entreprise
            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sites');
    }
};
