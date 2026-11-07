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
 *
 * Les documents suivent la présentation d'un document Word : Times New Roman 12 pt
 * (servie par Liberation Serif, de mêmes dimensions et sous licence libre), marges de 2,5 cm,
 * numérotation « Page X sur Y ».
 */
class PdfDocument
{
    /** Police des documents, déclarée dans pdf/layout.blade.php. */
    public const FONT = 'Times New Roman';

    /** Marge gauche et droite, en points (2,5 cm). */
    private const SIDE_MARGIN_PT = 70.87;

    public static function download(string $view, array $data, string $filename): Response
    {
        // Le moteur PDF y range les dimensions des polices : dossier inscriptible par le serveur
        $fontCache = storage_path('fonts');
        if (! is_dir($fontCache)) {
            mkdir($fontCache, 0775, true);
        }

        $options = new Options;
        $options->set('defaultFont', self::FONT);
        $options->set('isRemoteEnabled', false);
        $options->set('fontDir', $fontCache);
        $options->set('fontCache', $fontCache);
        $options->setChroot([storage_path(), resource_path('fonts')]);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view($view, $data)->render(), 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        self::numberPages($dompdf);

        $dompdf->addInfo('Title', (string) ($data['title'] ?? ''));
        $dompdf->addInfo('Author', (string) ($data['company']->name ?? config('app.name')));
        $dompdf->addInfo('Creator', config('app.name'));

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * « Page X sur Y » en bas à droite de chaque page, sur la ligne du pied de page.
     */
    private static function numberPages(Dompdf $dompdf): void
    {
        $margin = self::SIDE_MARGIN_PT;

        // Largeur exacte du texte sur chaque page, pour l'aligner sur la marge droite
        $dompdf->getCanvas()->page_script(function (int $page, int $count, $canvas, $metrics) use ($margin) {
            $font = $metrics->getFont(self::FONT) ?? $metrics->getFont('serif');
            $text = "Page {$page} sur {$count}";
            $size = 9;

            $canvas->text($canvas->get_width() - $margin - $metrics->getTextWidth($text, $font, $size), $canvas->get_height() - 51, $text, $font, $size, [0.35, 0.35, 0.35]);
        });
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

    /** Logo de Motriks (PNG transparent), pour les documents émis par Motriks : factures. */
    public static function motriksLogo(): string
    {
        return 'data:image/png;base64,'.base64_encode((string) file_get_contents(resource_path('images/motriks-logo-pdf.png')));
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
