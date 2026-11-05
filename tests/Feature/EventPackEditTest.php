<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Modification d'un pack enregistré : offre « X achetés, Y offerts », et désactivation.
 */
class EventPackEditTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_manager_changes_how_many_are_bought_and_offered_then_disables_the_pack()
    {
        $manager = User::factory()->create();
        $juice = $manager->company->products()->create(['name' => 'Jus mangue', 'unit' => 'bouteille', 'price' => 500]);
        $event = $manager->company->events()->create([
            'name' => 'Foire de Douala',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'created_by' => $manager->id,
        ]);
        $pack = $event->packs()->create(['name' => '2 achetés, 1 offert', 'type' => 'buy_get_free']);
        $pack->lines()->create(['product_id' => $juice->id, 'quantity' => 2, 'role' => 'paid']);
        $pack->lines()->create(['product_id' => $juice->id, 'quantity' => 1, 'role' => 'free']);

        // 3 achetés, 2 offerts, et le pack n'est plus proposé
        $this->actingAs($manager)->put(route('events.packs.update', [$event, $pack]), [
            'name' => '3 achetés, 2 offerts',
            'type' => 'buy_get_free',
            'price' => null,
            'active' => false,
            'lines' => [
                ['product_id' => $juice->id, 'quantity' => 3, 'role' => 'paid', 'unit_price' => null],
                ['product_id' => $juice->id, 'quantity' => 2, 'role' => 'free', 'unit_price' => null],
            ],
        ])->assertSessionHasNoErrors();

        $pack->refresh();
        $this->assertSame('3 achetés, 2 offerts', $pack->name);
        $this->assertFalse((bool) $pack->active);
        $this->assertSame(['paid' => 3, 'free' => 2], $pack->lines->pluck('quantity', 'role')->all());
    }

    public function test_an_offer_needs_a_bought_and_an_offered_product()
    {
        $manager = User::factory()->create();
        $juice = $manager->company->products()->create(['name' => 'Jus mangue', 'unit' => 'bouteille', 'price' => 500]);
        $event = $manager->company->events()->create(['name' => 'Foire', 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'created_by' => $manager->id]);
        $pack = $event->packs()->create(['name' => 'Offre', 'type' => 'buy_get_free']);

        $this->actingAs($manager)->put(route('events.packs.update', [$event, $pack]), [
            'name' => 'Offre',
            'type' => 'buy_get_free',
            'lines' => [['product_id' => $juice->id, 'quantity' => 2, 'role' => 'paid']],
        ])->assertSessionHasErrors('lines');
    }
}
