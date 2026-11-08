<?php

namespace App\Support\Billing;

use App\Enums\Plan;
use App\Models\SubscriptionPayment;
use App\Support\Pdf\FrenchNumber;
use App\Support\Pdf\PdfDocument;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Facture d'abonnement Motriks : données du gabarit (resources/views/pdf/invoice.blade.php),
 * PDF mis en cache, réponse en aperçu (inline) ou en téléchargement.
 * Le même PDF sert aux deux : l'aperçu est identique au fichier téléchargé.
 */
final class InvoiceDocument
{
    /** À incrémenter quand le gabarit change : les PDF en cache sont alors régénérés. */
    private const TEMPLATE_VERSION = 4;

    /** Statuts affichés (badge et filigrane). Un paiement enregistré est toujours « payée ». */
    public const STATUSES = [
        'paid' => ['label' => 'Payée', 'watermark' => 'PAYÉE', 'color' => '#027a48', 'soft' => '#ecfdf3'],
        'pending' => ['label' => 'En attente', 'watermark' => 'EN ATTENTE', 'color' => '#64748b', 'soft' => '#f1f5f9'],
        'overdue' => ['label' => 'En retard', 'watermark' => 'EN RETARD', 'color' => '#b54708', 'soft' => '#fffaeb'],
        'cancelled' => ['label' => 'Annulée', 'watermark' => 'ANNULÉE', 'color' => '#b42318', 'soft' => '#fef3f2'],
    ];

    public static function response(SubscriptionPayment $payment, bool $inline = false): Response
    {
        return PdfDocument::respond(self::pdf($payment), self::filename($payment), $inline);
    }

    /** Contenu du PDF, gardé en cache par facture et par date de modification. */
    public static function pdf(SubscriptionPayment $payment): string
    {
        // La date de modification de l'entreprise compte aussi : un nouveau logo ou une nouvelle adresse se voit tout de suite
        $payment->loadMissing('company');
        // … ainsi que les mentions de Motriks (ville, numéros marchands) : une modification de la configuration se voit aussi
        $key = sprintf(
            'invoice-pdf:%d:%d:%d:%s:v%d',
            $payment->id,
            $payment->updated_at?->timestamp ?? 0,
            $payment->company?->updated_at?->timestamp ?? 0,
            substr(md5((string) json_encode(config('motriks.billing'))), 0, 8),
            self::TEMPLATE_VERSION,
        );

        // Encodé en base64 : certains magasins de cache (base de données) n'acceptent pas le binaire brut
        return base64_decode(Cache::remember($key, now()->addDays(7), fn () => base64_encode(
            // Numérotation par le moteur (DomPDF ne connaît pas le nombre total de pages en CSS), à droite du pied de page
            PdfDocument::render('pdf.invoice', self::data($payment), numberPages: ['font' => 'DejaVu Sans', 'margin' => 45.35, 'bottom' => 44, 'size' => 7.5, 'color' => [0.61, 0.64, 0.69], 'format' => 'Page %d / %d']),
        )));
    }

    public static function filename(SubscriptionPayment $payment): string
    {
        return 'facture-'.strtolower($payment->invoice_number).'.pdf';
    }

    /** @return array<string, mixed> */
    public static function data(SubscriptionPayment $payment): array
    {
        $payment->loadMissing('company');
        $billing = config('motriks.billing');
        $client = $payment->company;
        $status = self::STATUSES['paid'];
        $currency = in_array($payment->currency, ['XAF', 'XOF'], true) ? 'FCFA' : $payment->currency;
        $money = fn (int|float $v) => PdfDocument::money($v, $currency);

        $period = $payment->period_end
            ? 'Du '.($payment->period_start ?? $payment->paid_at)->format('d/m/Y').' au '.$payment->period_end->format('d/m/Y')
            : null;

        $details = array_values(array_filter([
            $period,
            $payment->extra_packs > 0
                ? $payment->extra_packs.' pack'.($payment->extra_packs > 1 ? 's' : '').' d’extension (+'.Plan::PACK_HOSTESSES.' hôtesses et +'.Plan::PACK_SITES.' points de vente chacun)'
                : null,
            $payment->notes,
        ]));

        $methods = array_values(array_filter([
            $billing['orange_money'] ? ['Orange Money', $billing['orange_money']] : null,
            $billing['mtn_momo'] ? ['MTN Mobile Money', $billing['mtn_momo']] : null,
            $billing['bank'] ? ['Virement bancaire', $billing['bank']] : null,
            $billing['card'] ? ['Carte bancaire', $billing['card']] : null,
        ]));

        return [
            'title' => 'Facture '.$payment->invoice_number,
            'logo' => PdfDocument::motriksLogo(),
            'status' => $status,
            'invoice' => [
                'number' => $payment->invoice_number,
                'issued_at' => $payment->paid_at->format('d/m/Y'),
                'paid_at' => $payment->paid_at->locale('fr')->translatedFormat('j F Y'),
                'method' => $payment->methodLabel(),
                'reference' => $payment->reference,
            ],
            'issuer' => [
                'name' => $billing['name'],
                'lines' => array_values(array_filter([$billing['address'], $billing['city'], $billing['phone'], $billing['email']])),
                'legal' => array_values(array_filter([$billing['niu'] ? 'NIU '.$billing['niu'] : null, $billing['rccm'] ? 'RCCM '.$billing['rccm'] : null])),
            ],
            'client' => [
                'name' => $client->name,
                // Logo enregistré dans « Identité & marque » (JPG ou PNG ; le PNG exige l'extension GD)
                'logo' => PdfDocument::logo($client),
                'lines' => array_values(array_filter([$client->address, $client->city, $client->phone, $client->email])),
            ],
            'lines' => [[
                'label' => $payment->plan ? 'Forfait '.$payment->plan->label() : 'Abonnement à la plateforme '.config('app.name'),
                'details' => $details,
                'quantity' => 1,
                'unit_price' => $money($payment->amount),
                'total' => $money($payment->amount),
            ]],
            'totals' => [
                'subtotal' => $money($payment->amount),
                'total' => $money($payment->amount),
                'words' => ucfirst(FrenchNumber::words((int) $payment->amount)).' '.($currency === 'FCFA' ? 'francs CFA' : $currency),
            ],
            'methods' => $methods,
            'terms' => $billing['terms'],
            'footer' => array_values(array_filter([$billing['name'], $billing['city'], $billing['phone'], $billing['email']])),
        ];
    }
}
