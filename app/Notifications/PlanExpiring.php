<?php

namespace App\Notifications;

/**
 * Le forfait (ou l'essai) arrive à échéance, ou vient de se terminer : l'entreprise est alors en Starter.
 */
class PlanExpiring extends AppNotification
{
    public function __construct(private string $plan, private int $days, private string $endsOn, private bool $trial = false) {}

    public function kind(): string
    {
        return 'reminder';
    }

    public function title(): string
    {
        $what = $this->trial ? "Essai {$this->plan}" : "Forfait {$this->plan}";

        return $this->days < 0 ? "{$what} terminé" : "{$what} : fin le {$this->endsOn}";
    }

    public function body(): string
    {
        if ($this->days < 0) {
            return 'Votre entreprise est passée en Motriks Starter, le forfait gratuit. Vos données sont conservées : contactez-nous pour reprendre un forfait.';
        }

        $left = $this->days === 0 ? 'Il se termine aujourd’hui.' : "Il reste {$this->days} jour".($this->days > 1 ? 's' : '').'.';

        return $left.' Ensuite, votre entreprise passera en Motriks Starter. Contactez-nous pour '.($this->trial ? 'choisir votre forfait.' : 'le renouveler ou changer de forfait.');
    }

    protected function route(): array
    {
        return ['company.subscription'];
    }
}
