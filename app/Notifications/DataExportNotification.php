<?php

namespace App\Notifications;

use App\Models\DataExport;

/**
 * L'export des données, préparé en arrière-plan, est prêt (ou a échoué).
 * Envoyé aussi par e-mail : la préparation peut prendre du temps, le gérant a pu fermer la page.
 */
class DataExportNotification extends TextNotification
{
    protected bool $mail = true;

    public static function ready(DataExport $export): self
    {
        $size = $export->size ? ' ('.self::humanSize($export->size).')' : '';

        return new self('data_export_ready', 'export',
            'Vos données sont prêtes',
            "L’export complet{$size} est disponible pendant ".DataExport::AVAILABLE_HOURS.' h.',
            'company.data-export');
    }

    public static function failed(): self
    {
        return new self('data_export_failed', 'export',
            'L’export de vos données a échoué',
            'Relancez la préparation depuis la page « Mes données ». Si le problème continue, contactez le support.',
            'company.data-export');
    }

    protected function actionLabel(): string
    {
        return $this->type === 'data_export_ready' ? 'Télécharger mes données' : 'Relancer l’export';
    }

    public static function humanSize(int $bytes): string
    {
        return $bytes >= 1048576
            ? number_format($bytes / 1048576, 1, ',', ' ').' Mo'
            : max(1, (int) round($bytes / 1024)).' Ko';
    }
}
