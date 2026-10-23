<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('sector')->nullable()->after('name');
            $table->string('city')->nullable()->after('sector');
            $table->string('address')->nullable()->after('city');

            // Documents onboarding (chemins privés)
            $table->string('id_card_front_path')->nullable()->after('logo_path');
            $table->string('id_card_back_path')->nullable()->after('id_card_front_path');
            $table->string('registration_doc_path')->nullable()->after('id_card_back_path');

            $table->text('rejection_reason')->nullable()->after('status');
            $table->timestamp('onboarding_completed_at')->nullable()->after('rejection_reason');
        });

        // Mettre les entreprises existantes en actif si pas encore fait
        \Illuminate\Support\Facades\DB::statement(
            "UPDATE companies SET onboarding_completed_at = created_at WHERE status = 'active' AND onboarding_completed_at IS NULL"
        );
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'sector', 'city', 'address',
                'id_card_front_path', 'id_card_back_path', 'registration_doc_path',
                'rejection_reason', 'onboarding_completed_at',
            ]);
        });
    }
};
