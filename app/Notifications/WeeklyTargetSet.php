<?php

namespace App\Notifications;

use App\Models\WeeklyTarget;
use App\Support\Pdf\PdfDocument;
use Carbon\CarbonImmutable;

/**
 * Le responsable a fixé (ou modifié) l'objectif de la semaine d'une hôtesse. Sous la cloche uniquement.
 */
class WeeklyTargetSet extends AppNotification
{
    protected bool $mail = false;

    private string $weekStart;

    public function __construct(private int $amount, private string $currency, CarbonImmutable $weekStart)
    {
        $this->weekStart = $weekStart->toDateString();
    }

    public function kind(): string
    {
        return 'target';
    }

    public function title(): string
    {
        return 'Votre objectif de la semaine';
    }

    public function body(): string
    {
        $start = CarbonImmutable::parse($this->weekStart);
        $isCurrent = $start->equalTo(WeeklyTarget::weekOf(CarbonImmutable::now()));
        $when = $isCurrent ? 'cette semaine' : 'la semaine du '.$start->locale('fr')->translatedFormat('j F');

        return 'Objectif '.$when.' : '.PdfDocument::money($this->amount, $this->currency).' de ventes. Bonne semaine !';
    }

    protected function route(): array
    {
        return ['terrain.home'];
    }
}
