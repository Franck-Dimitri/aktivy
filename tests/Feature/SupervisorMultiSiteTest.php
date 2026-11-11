<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\Affectation;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Un superviseur affecté à plusieurs points de vente d'un coup.
 */
class SupervisorMultiSiteTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $supervisor;

    /** @var list<Site> */
    private array $sites = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->manager = User::factory()->create();
        $this->supervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);

        foreach (['Akwa', 'Bonapriso', 'Bastos'] as $name) {
            $this->sites[] = $this->manager->company->sites()->create(['name' => $name, 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        }
    }

    private function assign(User $member, array $siteIds)
    {
        return $this->actingAs($this->manager)->post(route('affectations.store'), [
            'user_id' => $member->id,
            'site_ids' => $siteIds,
            'starts_on' => today()->toDateString(),
        ]);
    }

    public function test_a_supervisor_is_assigned_to_several_points_of_sale_at_once()
    {
        $ids = array_map(fn (Site $s) => $s->id, $this->sites);

        $this->assign($this->supervisor, $ids)
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', "{$this->supervisor->name} est affecté(e) à 3 points de vente.");

        $this->assertSame(3, Affectation::where('user_id', $this->supervisor->id)->where('status', AffectationStatus::Active)->count());
        $this->assertEqualsCanonicalizing($ids, $this->supervisor->fresh()->managedSiteIds());

        // Une seule notification, qui nomme les points de vente
        $notifications = $this->supervisor->notifications()->get();
        $this->assertCount(1, $notifications);
        $this->assertSame('Vous supervisez 3 points de vente', $notifications->first()->data['title']);
        $this->assertStringStartsWith('Akwa, Bonapriso et Bastos, à partir du ', $notifications->first()->data['body']);
    }

    public function test_points_of_sale_already_supervised_are_skipped()
    {
        $this->assign($this->supervisor, [$this->sites[0]->id])->assertSessionHasNoErrors();

        $this->assign($this->supervisor, [$this->sites[0]->id, $this->sites[1]->id])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Affectation créée. Déjà affecté(e) à 1 autre : ignoré.');
        $this->assertSame(2, Affectation::where('user_id', $this->supervisor->id)->count());

        $this->assign($this->supervisor, [$this->sites[0]->id, $this->sites[1]->id])->assertSessionHasErrors('site_ids');
    }

    public function test_a_hostess_gets_a_single_point_of_sale()
    {
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);

        $this->assign($hostess, [$this->sites[0]->id, $this->sites[1]->id])->assertSessionHasErrors('site_ids');
        $this->assertSame(0, Affectation::where('user_id', $hostess->id)->count());

        $this->assign($hostess, [$this->sites[0]->id])->assertSessionHasNoErrors();
        $this->assertSame(1, Affectation::where('user_id', $hostess->id)->count());
    }

    public function test_a_site_of_another_company_is_refused()
    {
        $stranger = User::factory()->create();
        $other = $stranger->company->sites()->create(['name' => 'Ailleurs', 'type' => 'autre', 'city' => 'Yaoundé', 'created_by' => $stranger->id]);

        $this->assign($this->supervisor, [$this->sites[0]->id, $other->id])->assertSessionHasErrors('site_ids.1');
        $this->assertSame(0, Affectation::where('user_id', $this->supervisor->id)->count());
    }
}
