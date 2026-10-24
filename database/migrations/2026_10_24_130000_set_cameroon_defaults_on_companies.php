<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Les nouvelles entreprises sont créées au Cameroun par défaut : franc CFA d'Afrique centrale (XAF),
 * fuseau de Douala (UTC+1). Les valeurs d'origine étaient celles du Sénégal (XOF, Dakar).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('country', 2)->default('CM')->change();
            $table->string('timezone')->default('Africa/Douala')->change();
            $table->string('currency', 3)->default('XAF')->change();
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('country', 2)->default('SN')->change();
            $table->string('timezone')->default('Africa/Dakar')->change();
            $table->string('currency', 3)->default('XOF')->change();
        });
    }
};
