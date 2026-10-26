<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketTest extends TestCase
{
    use RefreshDatabase;

    private function ticket(User $agent): Ticket
    {
        return Ticket::create([
            'company_id' => $agent->company_id,
            'user_id' => $agent->id,
            'subject' => 'Rupture de stock',
            'body' => 'Plus de savon au rayon.',
            'priority' => 'urgent',
        ]);
    }

    public function test_managers_see_the_tickets_of_their_team_only()
    {
        $manager = User::factory()->create();
        $mine = $this->ticket(User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]));
        $this->ticket(User::factory()->fieldAgent()->create());

        $this->withoutVite()
            ->actingAs($manager)
            ->get(route('tickets.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('tickets/index')
                ->has('tickets', 1)
                ->where('tickets.0.id', $mine->id));
    }

    public function test_a_manager_can_answer_and_close_a_ticket()
    {
        $manager = User::factory()->create();
        $ticket = $this->ticket(User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]));

        $this->actingAs($manager)->put(route('tickets.update', $ticket), [
            'status' => 'closed',
            'response' => 'Réassort livré demain matin.',
        ])->assertSessionHasNoErrors();

        $ticket->refresh();
        $this->assertSame('closed', $ticket->status);
        $this->assertSame('Réassort livré demain matin.', $ticket->response);
        $this->assertSame($manager->id, $ticket->responded_by);
        $this->assertNotNull($ticket->responded_at);
    }

    public function test_the_ticket_of_another_company_can_not_be_answered()
    {
        $manager = User::factory()->create();
        $ticket = $this->ticket(User::factory()->fieldAgent()->create());

        $this->actingAs($manager)->put(route('tickets.update', $ticket), [
            'status' => 'closed',
            'response' => 'Hors périmètre',
        ])->assertForbidden();
    }

    public function test_field_agents_can_not_open_the_manager_screen()
    {
        $this->actingAs(User::factory()->fieldAgent()->create())
            ->get(route('tickets.index'))
            ->assertForbidden();
    }
}
