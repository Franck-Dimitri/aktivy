<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ventes de packs d'événement dans les rapports journaliers.
 *
 * Sur une ligne produit, units_sold et revenue restent les totaux (à l'unité + via les packs),
 * pour que les ventes, l'export et les objectifs n'aient rien à changer ; single_units garde
 * la part vendue à l'unité, celle que l'hôtesse saisit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_report_lines', function (Blueprint $table) {
            $table->unsignedInteger('single_units')->default(0)->after('opening_stock');
        });
        DB::table('daily_report_lines')->update(['single_units' => DB::raw('units_sold')]);

        Schema::create('daily_report_packs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_pack_id')->nullable()->constrained()->nullOnDelete();

            // Instantané du pack au moment de la vente
            $table->string('name');
            $table->unsignedInteger('unit_value');
            $table->unsignedInteger('quantity');
            $table->decimal('revenue', 14, 2);
            $table->timestamps();

            $table->unique(['daily_report_id', 'event_pack_id']);
        });

        // Les rapports n'étaient pas rattachés à l'événement de leur affectation
        $links = DB::table('daily_reports as r')
            ->join('visits as v', 'v.id', '=', 'r.visit_id')
            ->join('affectations as a', 'a.id', '=', 'v.affectation_id')
            ->whereNull('r.event_id')
            ->whereNotNull('a.event_id')
            ->pluck('a.event_id', 'r.id');

        foreach ($links as $reportId => $eventId) {
            DB::table('daily_reports')->where('id', $reportId)->update(['event_id' => $eventId]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_packs');

        Schema::table('daily_report_lines', function (Blueprint $table) {
            $table->dropColumn('single_units');
        });
    }
};
