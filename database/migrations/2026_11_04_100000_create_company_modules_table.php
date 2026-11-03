<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Modules payants activés pour chaque entreprise, avec leur période.
 * Les entreprises déjà validées gardent tout ce qu'elles utilisent : rien ne leur est retiré.
 * Celles encore en attente auront l'essai de 14 jours à leur validation.
 */
return new class extends Migration
{
    private const MODULES = ['terrain', 'stocks', 'reporting', 'events', 'photos', 'demandes'];

    public function up(): void
    {
        Schema::create('company_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('module', 30);
            $table->date('starts_on');
            // Vide : sans date de fin
            $table->date('ends_on')->nullable();
            $table->boolean('is_trial')->default(false);
            $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'module']);
        });

        $now = now();
        foreach (DB::table('companies')->whereIn('status', ['active', 'suspended'])->pluck('id') as $companyId) {
            foreach (self::MODULES as $module) {
                DB::table('company_modules')->insert([
                    'company_id' => $companyId, 'module' => $module, 'starts_on' => $now->toDateString(),
                    'ends_on' => null, 'is_trial' => false, 'notes' => 'Accès conservé à la mise en place des abonnements',
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('company_modules');
    }
};
