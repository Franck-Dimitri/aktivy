<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use App\Support\Excel\Workbook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ImportTest extends TestCase
{
    use RefreshDatabase;

    private function csv(string $name, string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    public function test_sites_are_imported_from_a_french_excel_csv_and_duplicates_are_skipped()
    {
        $manager = User::factory()->create();
        $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);

        $file = $this->csv('sites.csv', "Nom;Code;Type;Ville;Latitude;Longitude\n".
            "Akwa;;;Douala;;\n".                       // déjà présent
            "Santa Lucia Deido;SL-DEI;Supermarché;Douala;4,05;9,70\n".
            "Mahima Bastos;;pharmacie;Yaoundé;;\n".
            "Santa Lucia Deido;SL-DEI;;Douala;;\n");   // doublon dans le fichier

        $this->actingAs($manager)->post(route('company.import.store', 'sites'), ['file' => $file])
            ->assertSessionHas('import_result', fn ($r) => $r['ok'] && $r['created'] === 2 && $r['skipped'] === 2);

        $this->assertSame(3, $manager->company->sites()->count());
        $this->assertSame('supermarche', $manager->company->sites()->where('code', 'SL-DEI')->value('type')->value);
    }

    public function test_one_bad_line_imports_nothing_and_points_to_the_line()
    {
        $manager = User::factory()->create();
        $file = $this->csv('produits.csv', "Produit;Prix\nSavon;500\n;300\nCrème;gratuit\n");

        $this->actingAs($manager)->post(route('company.import.store', 'produits'), ['file' => $file])
            ->assertSessionHas('import_result', fn ($r) => ! $r['ok']
                && str_contains($r['errors'][0], 'Ligne 3')
                && str_contains($r['errors'][1], 'Ligne 4'));

        $this->assertSame(0, $manager->company->products()->count());
    }

    public function test_staff_get_a_temporary_password_and_a_number_taken_elsewhere_is_refused()
    {
        $manager = User::factory()->create();
        User::factory()->fieldAgent()->create(['phone' => '+237690000099']); // autre entreprise

        $ok = $this->csv('personnel.csv', "Nom,Téléphone,Rôle\nAwa Ngono,690000001,Hôtesse\nPaul Mbia,690000002,superviseur\n");
        $this->actingAs($manager)->post(route('company.import.store', 'personnel'), ['file' => $ok, 'password' => 'Motriks-2026!'])
            ->assertSessionHas('import_result', fn ($r) => $r['ok'] && $r['created'] === 2);

        $awa = User::where('phone', '+237690000001')->firstOrFail();
        $this->assertSame(Role::FieldAgent, $awa->role);
        $this->assertTrue($awa->must_change_password);
        $this->assertSame(Role::Supervisor, User::where('phone', '+237690000002')->value('role'));

        $this->post(route('logout'));
        $this->post(route('login.store'), ['login' => '690000001', 'password' => 'Motriks-2026!']);
        $this->assertAuthenticatedAs($awa);

        $taken = $this->csv('personnel.csv', "Nom,Téléphone\nIntrus,690000099\n");
        $this->actingAs($manager)->post(route('company.import.store', 'personnel'), ['file' => $taken, 'password' => 'Motriks-2026!'])
            ->assertSessionHas('import_result', fn ($r) => ! $r['ok'] && str_contains($r['errors'][0], 'déjà utilisé'));
    }

    public function test_a_real_excel_file_from_the_template_is_imported()
    {
        $manager = User::factory()->create();
        $path = tempnam(sys_get_temp_dir(), 'x').'.xlsx';
        $book = new Workbook($path);
        $book->sheet('Produits', ['Nom' => [Workbook::TEXT], 'Code' => [Workbook::TEXT], 'Unité' => [Workbook::TEXT], 'Prix' => [Workbook::MONEY]], [
            ['Savon karité', 'SAV-1', 'pièce', 500],
            ['Huile de coco', '', 'litre', 1500.5],
        ]);
        $book->close();

        $this->actingAs($manager)->post(route('company.import.store', 'produits'), [
            'file' => new UploadedFile($path, 'produits.xlsx', null, null, true),
        ])->assertSessionHas('import_result', fn ($r) => $r['ok'] && $r['created'] === 2);

        $this->assertEquals(1500.5, $manager->company->products()->where('name', 'Huile de coco')->value('price'));
        $this->actingAs($manager)->get(route('company.import.template', 'personnel'))->assertOk()->assertDownload('modele-import-personnel.xlsx');
    }

    public function test_only_the_manager_can_import()
    {
        $manager = User::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['company_id' => $manager->company_id]);

        $this->actingAs($supervisor)->post(route('company.import.store', 'sites'), ['file' => $this->csv('s.csv', "Nom;Ville\nA;B\n")])->assertForbidden();
        $this->actingAs($manager)->get(route('company.import.template', 'inconnu'))->assertNotFound();
    }

    public function test_the_setup_checklist_and_the_help_page()
    {
        $this->withoutVite();
        $manager = User::factory()->create();

        $this->actingAs($manager)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('setup.sites', false)->where('setup.identity', false));
        $this->actingAs(User::factory()->fieldAgent()->create())->get(route('help'))->assertOk();
    }
}
