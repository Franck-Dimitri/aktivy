<?php

namespace Database\Seeders;

use App\Enums\AffectationStatus;
use App\Enums\Plan;
use App\Models\Company;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use App\Support\Demo\DemoAccounts;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Données de l'entreprise de démo, pour tout essayer sans rien saisir :
 * - forfait Business sans date de fin (toutes les fonctions ouvertes) ;
 * - 6 produits, 4 points de vente géolocalisés à Douala et Yaoundé, leur stock (dont des produits bas et critiques) ;
 * - l'hôtesse affectée à Santa Lucia Akwa, le superviseur à Akwa et Bonapriso (plusieurs sites) ;
 * - 14 jours de rapports soumis pour l'hôtesse (ventes, une journée en boutiques extérieures,
 *   un pointage hors du point de vente), aujourd'hui restant libre pour prendre son service soi-même.
 *
 * Relançable : ce qui existe est retrouvé par son nom, l'historique n'est créé qu'une fois.
 */
class DemoDataSeeder extends Seeder
{
    /** [nom, unité, prix FCFA] */
    private const PRODUCTS = [
        ['Savon Lux 90 g', 'pièce', 500],
        ['Crème Nivea 200 ml', 'tube', 2500],
        ['Lait Nido 400 g', 'boîte', 3200],
        ['Huile Diamaor 1 L', 'bouteille', 1800],
        ['Biscuits Parle-G 100 g', 'paquet', 200],
        ['Jus Top Ananas 1 L', 'bouteille', 1000],
    ];

    /** [nom, type, ville, quartier, latitude, longitude, stock de départ par produit] */
    private const SITES = [
        ['Santa Lucia Akwa', 'supermarche', 'Douala', 'Akwa', 4.0511, 9.7679, [120, 30, 4, 45, 300, 60]],
        ['Mahima Bonapriso', 'supermarche', 'Douala', 'Bonapriso', 4.0283, 9.6950, [80, 6, 25, 2, 150, 40]],
        ['Carrefour Bastos', 'hypermarche', 'Yaoundé', 'Bastos', 3.8890, 11.5100, [200, 50, 40, 60, 400, 90]],
        ['Dovv Mvan', 'supermarche', 'Yaoundé', 'Mvan', 3.8235, 11.5180, [60, 12, 8, 20, 100, 3]],
    ];

    /** Journées d'historique de l'hôtesse (hors aujourd'hui). */
    private const HISTORY_DAYS = 14;

    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $company = Company::where('slug', DemoAccounts::COMPANY_SLUG)->first();
        $manager = User::where('email', 'gerant@demo.test')->first();
        $hostess = User::where('phone', '+237690000001')->first();
        $supervisor = User::where('email', 'superviseur@demo.test')->first();

        if (! $company || ! $manager || ! $hostess || ! $supervisor) {
            return;
        }

        DB::transaction(function () use ($company, $manager, $hostess, $supervisor) {
            // Toutes les fonctions ouvertes, sans échéance (une démo n'expire pas)
            if ($company->currentPlan() === Plan::Starter) {
                $company->setPlan(Plan::Business);
            }

            $products = collect(self::PRODUCTS)->map(fn (array $p) => $company->products()->firstOrCreate(
                ['name' => $p[0]],
                ['unit' => $p[1], 'price' => $p[2], 'is_active' => true],
            ));

            $sites = collect(self::SITES)->map(function (array $s) use ($company, $manager, $products) {
                $site = $company->sites()->firstOrCreate(['name' => $s[0]], [
                    'type' => $s[1], 'city' => $s[2], 'region' => $s[3], 'address' => "Quartier {$s[3]}, {$s[2]}",
                    'latitude' => $s[4], 'longitude' => $s[5],
                    'opening_time' => '08:00', 'closing_time' => '20:00',
                    'contact_name' => 'Chef de rayon', 'created_by' => $manager->id,
                ]);

                foreach ($products as $i => $product) {
                    SiteProduct::firstOrCreate(
                        ['site_id' => $site->id, 'product_id' => $product->id],
                        ['company_id' => $company->id, 'current_stock' => $s[6][$i], 'alert_threshold' => 10, 'critical_threshold' => 5, 'updated_by' => $manager->id],
                    );
                }

                return $site;
            })->keyBy('name');

            $akwa = $sites['Santa Lucia Akwa'];
            $start = CarbonImmutable::today()->subDays(self::HISTORY_DAYS + 5);

            // L'hôtesse sur son point de vente ; le superviseur sur deux points de vente de Douala
            $this->assign($company, $hostess, $akwa, $manager, $start, '08:00', '17:00');
            $this->assign($company, $supervisor, $akwa, $manager, $start);
            $this->assign($company, $supervisor, $sites['Mahima Bonapriso'], $manager, $start);

            $this->history($company, $hostess, $akwa, $sites['Mahima Bonapriso']);
        });
    }

    private function assign(Company $company, User $member, Site $site, User $by, CarbonImmutable $from, ?string $slotStart = null, ?string $slotEnd = null): void
    {
        $company->affectations()->firstOrCreate(
            ['user_id' => $member->id, 'site_id' => $site->id, 'status' => AffectationStatus::Active],
            ['assigned_by' => $by->id, 'starts_on' => $from->toDateString(), 'slot_start' => $slotStart, 'slot_end' => $slotEnd],
        );
    }

    /**
     * Rapports soumis des jours passés : quantités variées, une journée avec des ventes en boutiques
     * extérieures, une prise de service faite à Bonapriso (hors de son point de vente).
     */
    private function history(Company $company, User $hostess, Site $site, Site $elsewhere): void
    {
        if (DailyReport::where('user_id', $hostess->id)->exists()) {
            return;
        }

        $stocks = SiteProduct::where('site_id', $site->id)->with('product')->get();
        $affectationId = $company->affectations()->where('user_id', $hostess->id)->where('site_id', $site->id)->value('id');
        mt_srand(2026);

        // Reconstruit à rebours depuis le stock actuel : la clôture d'un jour est l'ouverture du lendemain
        $running = $stocks->mapWithKeys(fn (SiteProduct $s) => [$s->id => $s->current_stock])->all();

        // Rang de la journée travaillée (dimanches sautés), du plus récent au plus ancien
        $rank = 0;

        for ($daysAgo = 1; $daysAgo <= self::HISTORY_DAYS; $daysAgo++) {
            $day = CarbonImmutable::today()->subDays($daysAgo);
            if ($day->isSunday()) {
                continue;
            }
            $rank++;

            // 2e journée : boutiques extérieures ; 3e : prise de service faite à Bonapriso
            $offSite = $rank === 3;
            $checkIn = $day->setTime(8, mt_rand(0, 25));
            $checkOut = $day->setTime(17, mt_rand(0, 30));
            $at = $offSite ? [$elsewhere->latitude + 0.0004, $elsewhere->longitude + 0.0003] : [$site->latitude + 0.0001, $site->longitude + 0.0001];

            $visit = $company->visits()->create([
                'site_id' => $site->id, 'user_id' => $hostess->id, 'affectation_id' => $affectationId,
                'checked_in_at' => $checkIn, 'checked_out_at' => $checkOut,
                'duration_minutes' => (int) $checkIn->diffInMinutes($checkOut),
                'checkin_latitude' => $at[0], 'checkin_longitude' => $at[1],
                'checkin_distance_m' => $site->distanceTo($at[0], $at[1]), 'checkin_accuracy_m' => mt_rand(6, 25),
                'status' => 'completed',
            ]);

            $report = DailyReport::create([
                'company_id' => $company->id, 'site_id' => $site->id, 'user_id' => $hostess->id, 'visit_id' => $visit->id,
                'report_date' => $day->toDateString(), 'status' => 'submitted', 'submitted_at' => $day->setTime(16, mt_rand(30, 59)),
                'notes' => $rank === 4 ? 'Forte affluence en fin d’après-midi, promotion sur le lait.' : null,
            ]);

            foreach ($stocks as $stock) {
                $sold = max(0, (int) round(mt_rand(0, 12) * match ($stock->product->unit) { 'paquet' => 3, 'pièce' => 2, default => 1 } * ($day->isSaturday() ? 1.5 : 1)));
                $closing = $running[$stock->id];
                $running[$stock->id] = $closing + $sold;

                DailyReportLine::create([
                    'daily_report_id' => $report->id, 'site_product_id' => $stock->id,
                    'product_name' => $stock->product->name, 'unit' => $stock->product->unit, 'unit_price' => $stock->product->price,
                    'opening_stock' => $closing + $sold, 'single_units' => $sold, 'units_sold' => $sold,
                    'closing_stock' => $closing, 'revenue' => $sold * $stock->product->price,
                ]);
            }

            // Une journée avec des ventes en boutiques extérieures (hors stock du point de vente)
            if ($rank === 2) {
                foreach ([['Boutique Chez Mama', 0, 12], ['Boutique Chez Mama', 4, 30], ['Quincaillerie Akwa', 3, 4]] as [$shop, $i, $units]) {
                    $stock = $stocks[$i];
                    DailyReportLine::create([
                        'daily_report_id' => $report->id, 'product_id' => $stock->product_id, 'external_shop' => $shop,
                        'product_name' => $stock->product->name, 'unit' => $stock->product->unit, 'unit_price' => $stock->product->price,
                        'opening_stock' => 0, 'single_units' => $units, 'units_sold' => $units, 'closing_stock' => 0,
                        'revenue' => $units * $stock->product->price,
                    ]);
                }
            }
        }
    }
}
