<?php

namespace App\Support\Pdf;

use App\Models\Company;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Rend une vue Blade en PDF (A4) et la renvoie en téléchargement.
 * Aucune ressource distante n'est chargée : images et logo sont intégrés au document.
 */
class PdfDocument
{
    public static function download(string $view, array $data, string $filename): Response
    {
        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);
        $options->setChroot(storage_path());

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view($view, $data)->render(), 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Image d'un disque, intégrée au PDF (data URI) ; null si elle est introuvable.
     */
    public static function image(string $disk, ?string $path): ?string
    {
        if (! $path || ! Storage::disk($disk)->exists($path)) {
            return null;
        }

        $mime = Storage::disk($disk)->mimeType($path) ?: 'image/jpeg';

        // Formats que le moteur PDF sait afficher
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/gif'], true)) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk($disk)->get($path));
    }

    /** Logo de l'entreprise, s'il y en a un. */
    public static function logo(Company $company): ?string
    {
        return self::image('public', $company->logo_path);
    }

    /** Montant au format français, sans décimales. */
    public static function money(float|int|string $amount, string $currency): string
    {
        return number_format((float) $amount, 0, ',', "\u{00A0}").' '.$currency;
    }
}
