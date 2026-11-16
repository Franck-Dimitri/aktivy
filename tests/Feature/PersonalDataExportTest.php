<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * « Mes données » : chacun télécharge ses propres données, et seulement les siennes.
 */
class PersonalDataExportTest extends TestCase
{
    use RefreshDatabase;

    private function sheet(string $path, int $number): string
    {
        $zip = new \ZipArchive;
        $zip->open($path);
        $xml = (string) $zip->getFromName("xl/worksheets/sheet{$number}.xml");
        $zip->close();

        return $xml;
    }

    public function test_a_hostess_downloads_her_own_data_and_nobody_else_s()
    {
        $manager = User::factory()->create();
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id, 'name' => 'Awa Ndongo']);
        $colleague = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id, 'name' => 'Collègue Inconnue']);
        $site = $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        foreach ([$hostess, $colleague] as $who) {
            $manager->company->visits()->create([
                'site_id' => $site->id, 'user_id' => $who->id, 'checked_in_at' => now()->subDay(),
                'checkin_latitude' => $who->is($hostess) ? 4.0511 : 3.8667, 'checkin_longitude' => 9.7679, 'status' => 'completed',
            ]);
        }

        $response = $this->actingAs($hostess)->get(route('personal-data.export'));

        $response->assertOk();
        $this->assertStringContainsString('mes-donnees-motriks-', (string) $response->headers->get('Content-Disposition'));

        $file = $response->baseResponse->getFile()->getPathname();
        $account = $this->sheet($file, 1);
        $visits = $this->sheet($file, 3);

        $this->assertStringContainsString('Awa Ndongo', $account);
        $this->assertStringContainsString('4.0511', $visits);
        // Rien de la collègue
        $this->assertStringNotContainsString('Collègue Inconnue', $account.$visits);
        $this->assertStringNotContainsString('3.8667', $visits);
    }

    public function test_the_export_needs_to_be_logged_in()
    {
        $this->get(route('personal-data.export'))->assertRedirect(route('login'));
    }
}
