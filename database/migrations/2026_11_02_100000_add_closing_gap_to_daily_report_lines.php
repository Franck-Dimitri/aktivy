<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Clôture journalière : écart entre le stock compté par l'hôtesse et le stock théorique,
 * avec son motif, obligatoire dès qu'il y a un écart.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_report_lines', function (Blueprint $table) {
            $table->integer('stock_gap')->default(0)->after('closing_stock');
            $table->string('gap_reason', 300)->nullable()->after('stock_gap');
        });
    }

    public function down(): void
    {
        Schema::table('daily_report_lines', function (Blueprint $table) {
            $table->dropColumn(['stock_gap', 'gap_reason']);
        });
    }
};
