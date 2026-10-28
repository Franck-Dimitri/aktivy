<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Relecture des rapports par le responsable : correction éventuelle, puis validation qui fige le rapport.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->timestamp('corrected_at')->nullable()->after('submitted_at');
            $table->foreignId('corrected_by')->nullable()->after('corrected_at')->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable()->after('corrected_by');
            $table->foreignId('validated_by')->nullable()->after('validated_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('validated_by');
            $table->dropColumn('validated_at');
            $table->dropConstrainedForeignId('corrected_by');
            $table->dropColumn('corrected_at');
        });
    }
};
