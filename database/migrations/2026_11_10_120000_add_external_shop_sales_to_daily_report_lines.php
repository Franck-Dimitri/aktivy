<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ventes en boutique extérieure : l'hôtesse vend les produits de son point de vente, aux mêmes prix,
 * dans une autre boutique, sans toucher au stock de son point de vente.
 *
 * Elles sont enregistrées comme des lignes du rapport journalier, marquées du nom de la boutique
 * (external_shop) et rattachées au produit du catalogue (product_id) plutôt qu'au stock du site
 * (site_product_id, désormais facultatif). Elles comptent ainsi dans le chiffre d'affaires, les
 * objectifs et les statistiques, et restent repérables pour être affichées à part.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_report_lines', function (Blueprint $table) {
            $table->unsignedBigInteger('site_product_id')->nullable()->change();
            $table->foreignId('product_id')->nullable()->after('site_product_id')->constrained()->nullOnDelete();
            $table->string('external_shop', 120)->nullable()->after('product_id');
            $table->index(['daily_report_id', 'external_shop']);
        });
    }

    public function down(): void
    {
        Schema::table('daily_report_lines', function (Blueprint $table) {
            $table->dropIndex(['daily_report_id', 'external_shop']);
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn('external_shop');
        });
    }
};
