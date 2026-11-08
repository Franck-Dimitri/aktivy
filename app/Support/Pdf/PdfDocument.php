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
        return self::respond(self::render($view, $data), $filename);
    }

    /**
     * PDF prêt à envoyer : en téléchargement, ou affiché dans le navigateur (`$inline`, aperçu).
     */
    public static function respond(string $pdf, string $filename, bool $inline = false): Response
    {
        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.$filename.'"',
        ]);
    }

    /**
     * Contenu du PDF. `$numberPages` : « Page X sur Y » ajoutée par le moteur (documents au gabarit
     * pdf/layout) ; un gabarit qui numérote lui-même ses pages (facture) passe false.
     */
    public static function render(string $view, array $data, bool|array $numberPages = true): string
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

        if ($numberPages !== false) {
            self::numberPages($dompdf, is_array($numberPages) ? $numberPages : []);
        }

        $dompdf->addInfo('Title', (string) ($data['title'] ?? ''));
        $dompdf->addInfo('Author', (string) ($data['company']->name ?? config('app.name')));
        $dompdf->addInfo('Creator', config('app.name'));

        return (string) $dompdf->output();
    }

    /**
     * « Page X sur Y » en bas à droite de chaque page, sur la ligne du pied de page.
     */
    /**
     * @param  array{font?: string, margin?: float, bottom?: float, size?: float, color?: array<int, float>, format?: string}  $style
     *                                                                                                                             réglages d'un gabarit autre que pdf/layout (ex. la facture)
     */
    private static function numberPages(Dompdf $dompdf, array $style = []): void
    {
        $margin = $style['margin'] ?? self::SIDE_MARGIN_PT;
        $bottom = $style['bottom'] ?? 51;
        $size = $style['size'] ?? 9;
        $color = $style['color'] ?? [0.35, 0.35, 0.35];
        $format = $style['format'] ?? 'Page %d sur %d';
        $fontName = $style['font'] ?? self::FONT;

        // Largeur exacte du texte sur chaque page, pour l'aligner sur la marge droite
        $dompdf->getCanvas()->page_script(function (int $page, int $count, $canvas, $metrics) use ($margin, $bottom, $size, $color, $format, $fontName) {
            $font = $metrics->getFont($fontName) ?? $metrics->getFont('serif');
            $text = sprintf($format, $page, $count);

            $canvas->text($canvas->get_width() - $margin - $metrics->getTextWidth($text, $font, $size), $canvas->get_height() - $bottom, $text, $font, $size, $color);
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

        // Formats que le moteur PDF sait afficher (le PNG exige l'extension GD de PHP)
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/gif'], true) || ($mime === 'image/png' && ! self::pngSupported())) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk($disk)->get($path));
    }

    /**
     * Logo de Motriks pour les documents émis par Motriks (factures). En JPEG sur fond blanc :
     * le moteur PDF le lit sans l'extension GD, il s'affiche donc partout.
     */
    public static function motriksLogo(): string
    {
        return 'data:image/jpeg;base64,'.base64_encode((string) file_get_contents(resource_path('images/motriks-logo-pdf.jpg')));
    }

    /** Le moteur PDF (dompdf) a besoin de l'extension GD pour afficher une image PNG. */
    private static function pngSupported(): bool
    {
        return extension_loaded('gd');
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
