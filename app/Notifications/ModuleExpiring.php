<?php

namespace App\Notifications;

/**
 * Un module payant arrive à échéance, ou vient d'expirer.
 */
class ModuleExpiring extends AppNotification
{
    public function __construct(private string $module, private int $days, private string $endsOn) {}

    public function kind(): string
    {
        return 'reminder';
    }

    public function title(): string
    {
        return $this->days < 0 ? "Module « {$this->module} » expiré" : "Module « {$this->module} » : fin le {$this->endsOn}";
    }

    public function body(): string
    {
        return $this->days < 0
            ? 'Votre entreprise est revenue à l’offre gratuite pour ce module. Vos données sont conservées : contactez-nous pour le réactiver.'
            : "Il reste {$this->days} jour".($this->days > 1 ? 's' : '').' avant la fin de ce module. Contactez-nous pour le renouveler ou changer de formule.';
    }

    protected function route(): array
    {
        return ['company.subscription'];
    }
}
