<?php

namespace App\Notifications;

use App\Models\Company;

/**
 * Une entreprise a envoyé (ou renvoyé après un refus) son dossier d'inscription :
 * le super-admin doit l'examiner.
 */
class CompanySubmitted extends AppNotification
{
    private int $companyId;

    private string $name;

    private ?string $city;

    public function __construct(Company $company, private bool $resubmitted = false)
    {
        $this->companyId = $company->id;
        $this->name = $company->name;
        $this->city = $company->city;
    }

    public function kind(): string
    {
        return 'signup';
    }

    public function title(): string
    {
        return $this->resubmitted ? "Dossier renvoyé · {$this->name}" : "Nouvelle inscription · {$this->name}";
    }

    public function body(): string
    {
        $where = $this->city ? " ({$this->city})" : '';

        return $this->resubmitted
            ? "{$this->name}{$where} a corrigé et renvoyé son dossier. Il est de nouveau à examiner."
            : "{$this->name}{$where} a envoyé ses documents. Le dossier attend votre décision.";
    }

    protected function actionLabel(): string
    {
        return 'Examiner le dossier';
    }

    protected function route(): array
    {
        return ['admin.onboarding.show', ['company' => $this->companyId]];
    }
}
