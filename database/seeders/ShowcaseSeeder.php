<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Company;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\SalesTarget;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use App\Models\WeeklyTarget;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Entreprise « vitrine » pour les captures d'écran du site et des réseaux sociaux.
 *
 *     php artisan db:seed --class=ShowcaseSeeder
 *
 * Données entièrement fictives (aucune enseigne, aucune marque, aucun client réel) : 10 points de vente
 * à Douala et Yaoundé, 10 hôtesses, 30 jours de rapports, une journée en cours (pointages et rapports du
 * jour), des stocks bas et des objectifs. Gérant : vitrine@demo.test / password.
 * Jamais en production : le mot de passe est connu de tous.
 */
class ShowcaseSeeder extends Seeder
{
    private const SLUG = 'vitrine-motriks';

    private const HISTORY_DAYS = 30;

    /** [nom, unité, prix FCFA, ventes moyennes par jour] */
    private const PRODUCTS = [
        ['Lait en poudre 400 g', 'boîte', 3200, 9],
        ['Huile de table 1 L', 'bouteille', 1800, 11],
        ['Savon de toilette 90 g', 'pièce', 500, 22],
        ['Crème hydratante 200 ml', 'tube', 2500, 6],
        ['Biscuits 100 g', 'paquet', 200, 40],
        ['Jus d’ananas 1 L', 'bouteille', 1000, 14],
        ['Riz parfumé 5 kg', 'sac', 6500, 4],
        ['Lessive 1 kg', 'paquet', 1500, 8],
    ];

    /** [nom, type, ville, quartier, latitude, longitude, hôtesse] */
    private const SITES = [
        ['Supermarché Akwa', 'supermarche', 'Douala', 'Akwa', 4.0511, 9.7679, 'Awa Mballa'],
        ['Supermarché Bonapriso', 'supermarche', 'Douala', 'Bonapriso', 4.0283, 9.6950, 'Grâce Ngo Bassa'],
        ['Supérette Bonamoussadi', 'supermarche', 'Douala', 'Bonamoussadi', 4.0890, 9.7550, 'Mireille Ebongue'],
        ['Supermarché Ndokoti', 'supermarche', 'Douala', 'Ndokoti', 4.0450, 9.7380, 'Linda Tchoua'],
        ['Supermarché Bonabéri', 'supermarche', 'Douala', 'Bonabéri', 4.0700, 9.6620, 'Sandrine Kotto'],
        ['Hypermarché Bastos', 'hypermarche', 'Yaoundé', 'Bastos', 3.8890, 11.5100, 'Carine Atangana'],
        ['Supermarché Mvan', 'supermarche', 'Yaoundé', 'Mvan', 3.8235, 11.5180, 'Estelle Mbida'],
        ['Supermarché Essos', 'supermarche', 'Yaoundé', 'Essos', 3.8730, 11.5390, 'Joëlle Fouda'],
        ['Supérette Mvog-Ada', 'supermarche', 'Yaoundé', 'Mvog-Ada', 3.8580, 11.5250, 'Prisca Nnomo'],
        ['Supermarché Biyem-Assi', 'supermarche', 'Yaoundé', 'Biyem-Assi', 3.8330, 11.4880, 'Rachel Owona'],
    ];

    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            $this->command?->error('Seeder vitrine réservé aux environnements local et testing.');

            return;
        }

        if (Company::where('slug', self::SLUG)->exists()) {
            $this->command?->info('Entreprise vitrine déjà présente : rien à faire.');

            return;
        }

        mt_srand(2611);

        DB::transaction(function () {
            $company = Company::create([
                'name' => 'Distribution Démo', 'slug' => self::SLUG, 'email' => 'contact@vitrine.test',
                'phone' => '+237233000001', 'city' => 'Douala', 'status' => AccountStatus::Active,
                'onboarding_completed_at' => now(),
            ]);
            $company->setPlan(Plan::Business);
            $company->forceFill(['logo_path' => $this->logo()])->save();

            $password = Hash::make('password');
            $manager = $company->users()->create([
                'name' => 'Paul Ekotto', 'email' => 'vitrine@demo.test', 'role' => Role::CompanyAdmin,
                'password' => $password, 'status' => AccountStatus::Active,
            ]);
            $manager->forceFill(['email_verified_at' => now(), 'last_login_at' => now()])->save();

            $products = collect(self::PRODUCTS)->map(fn (array $p) => $company->products()->create([
                'name' => $p[0], 'unit' => $p[1], 'price' => $p[2], 'is_active' => true, 'created_by' => $manager->id,
            ]));

            $start = CarbonImmutable::today()->subDays(self::HISTORY_DAYS + 3);
            $phone = 690100000;

            foreach (self::SITES as $k => [$name, $type, $city, $area, $lat, $lng, $hostessName]) {
                $site = $company->sites()->create([
                    'name' => $name, 'type' => $type, 'city' => $city, 'region' => $area,
                    'address' => "Quartier {$area}, {$city}", 'latitude' => $lat, 'longitude' => $lng,
                    'opening_time' => '08:00', 'closing_time' => '20:00', 'contact_name' => 'Chef de rayon',
                    'created_by' => $manager->id,
                ]);

                $hostess = $company->users()->create([
                    'name' => $hostessName, 'phone' => '+237'.($phone + $k), 'role' => Role::FieldAgent,
                    'password' => $password, 'status' => AccountStatus::Active,
                ]);

                $affectation = $company->affectations()->create([
                    'user_id' => $hostess->id, 'site_id' => $site->id, 'status' => AffectationStatus::Active,
                    'assigned_by' => $manager->id, 'starts_on' => $start->toDateString(), 'slot_start' => '08:00', 'slot_end' => '17:00',
                ]);

                // Stock actuel : quelques produits bas pour faire vivre les alertes
                $stocks = $products->map(function ($product, $i) use ($company, $site, $manager, $k) {
                    $low = ($k + $i) % 7 === 0;

                    return SiteProduct::create([
                        'company_id' => $company->id, 'site_id' => $site->id, 'product_id' => $product->id,
                        'current_stock' => $low ? mt_rand(2, 8) : mt_rand(40, 160),
                        'alert_threshold' => 10, 'critical_threshold' => 5, 'updated_by' => $manager->id,
                    ]);
                });

                // Points de vente plus ou moins actifs : le classement du tableau de bord varie
                $weight = 0.65 + ($k % 5) * 0.12;
                $this->history($company, $hostess, $site, $affectation->id, $stocks, $products, $weight);
                $this->today($company, $hostess, $site, $affectation->id, $stocks, $products, $weight, $k);

                WeeklyTarget::create([
                    'company_id' => $company->id, 'user_id' => $hostess->id,
                    'week_start' => CarbonImmutable::today()->startOfWeek()->toDateString(),
                    'amount' => (int) (round(110000 * $weight / 5000) * 5000), 'updated_by' => $manager->id,
                ]);
            }

            SalesTarget::create([
                'company_id' => $company->id, 'site_id' => null, 'user_id' => null,
                'month' => CarbonImmutable::today()->startOfMonth()->toDateString(), 'amount' => 6000000, 'updated_by' => $manager->id,
            ]);
        });

        $this->command?->info('Entreprise vitrine créée : vitrine@demo.test / password');
    }

    /** Rapports soumis des jours passés (dimanches non travaillés). */
    private function history(Company $company, User $hostess, Site $site, int $affectationId, $stocks, $products, float $weight): void
    {
        for ($daysAgo = self::HISTORY_DAYS; $daysAgo >= 1; $daysAgo--) {
            $day = CarbonImmutable::today()->subDays($daysAgo);
            if ($day->isSunday()) {
                continue;
            }

            $in = $day->setTime(8, mt_rand(0, 30));
            $out = $day->setTime(17, mt_rand(0, 40));
            $visit = $company->visits()->create([
                'site_id' => $site->id, 'user_id' => $hostess->id, 'affectation_id' => $affectationId,
                'checked_in_at' => $in, 'checked_out_at' => $out, 'duration_minutes' => (int) $in->diffInMinutes($out),
                'checkin_latitude' => $site->latitude + 0.0001, 'checkin_longitude' => $site->longitude + 0.0001,
                'checkin_distance_m' => mt_rand(4, 40), 'checkin_accuracy_m' => mt_rand(6, 25), 'status' => 'completed',
            ]);

            $this->report($company, $hostess, $site, $visit->id, $day, $stocks, $products, $weight * ($day->isSaturday() ? 1.4 : 1), true);
        }
    }

    /** Aujourd'hui : la plupart en poste, une partie a déjà envoyé son rapport, deux pas encore arrivées. */
    private function today(Company $company, User $hostess, Site $site, int $affectationId, $stocks, $products, float $weight, int $k): void
    {
        if ($k >= 8) {
            return;
        }

        $day = CarbonImmutable::today();
        $in = $day->setTime(7, 45 + ($k * 4) % 40);
        $submitted = $k < 7;
        $visit = $company->visits()->create([
            'site_id' => $site->id, 'user_id' => $hostess->id, 'affectation_id' => $affectationId,
            'checked_in_at' => $in, 'checked_out_at' => null,
            'checkin_latitude' => $site->latitude + 0.0001, 'checkin_longitude' => $site->longitude + 0.0001,
            'checkin_distance_m' => mt_rand(4, 40), 'checkin_accuracy_m' => mt_rand(6, 25), 'status' => 'in_progress',
        ]);

        $this->report($company, $hostess, $site, $visit->id, $day, $stocks, $products, $weight * 1.25, $submitted);
    }

    private function report(Company $company, User $hostess, Site $site, int $visitId, CarbonImmutable $day, $stocks, $products, float $factor, bool $submitted): void
    {
        $report = DailyReport::create([
            'company_id' => $company->id, 'site_id' => $site->id, 'user_id' => $hostess->id, 'visit_id' => $visitId,
            'report_date' => $day->toDateString(), 'status' => $submitted ? 'submitted' : 'draft',
            'submitted_at' => $submitted ? $day->setTime(16, mt_rand(0, 59)) : null,
        ]);

        foreach ($stocks as $i => $stock) {
            $product = $products[$i];
            $sold = max(0, (int) round(self::PRODUCTS[$i][3] * $factor * (mt_rand(60, 140) / 100)));
            $opening = $stock->current_stock + $sold;

            DailyReportLine::create([
                'daily_report_id' => $report->id, 'site_product_id' => $stock->id,
                'product_name' => $product->name, 'unit' => $product->unit, 'unit_price' => $product->price,
                'opening_stock' => $opening, 'single_units' => $sold, 'units_sold' => $sold,
                'closing_stock' => $stock->current_stock, 'revenue' => $sold * $product->price,
            ]);
        }
    }

    /** Logo fictif (monogramme) : l'assistant de démarrage ne s'affiche pas sur les captures. */
    private function logo(): string
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0F172A"/>'
            .'<text x="32" y="41" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">DD</text></svg>';
        $path = 'logos/vitrine-motriks.svg';
        Storage::disk('public')->put($path, $svg);

        return $path;
    }
}
