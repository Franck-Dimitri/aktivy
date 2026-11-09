<?php

namespace App\Support\Company;

use App\Models\AuditLog;
use App\Models\Company;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Documents légaux d'une entreprise : CNI du gérant (recto et verso) et registre de commerce.
 *
 * Fichiers privés (disque local), rangés comme ceux du dossier d'inscription. Déposés par
 * l'entreprise à l'inscription, puis ajoutés ou remplacés à tout moment par le super
 * administrateur ou par le gérant.
 */
class CompanyDocuments
{
    /** Type de document => [colonne, libellé]. */
    public const TYPES = [
        'id_card_front' => ['id_card_front_path', 'CNI du gérant · recto'],
        'id_card_back' => ['id_card_back_path', 'CNI du gérant · verso'],
        'registration_doc' => ['registration_doc_path', 'Registre de commerce'],
    ];

    /** Règles d'un fichier déposé : image ou PDF, 10 Mo au plus. */
    public const RULES = ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'];

    public const MESSAGES = [
        'file.required' => 'Choisissez un fichier.',
        'file.mimes' => 'Le document doit être une image JPG ou PNG, ou un PDF.',
        'file.max' => 'Le document dépasse 10 Mo.',
        'file.uploaded' => 'Le document n’a pas pu être envoyé. Réessayez.',
    ];

    public static function exists(string $type): bool
    {
        return isset(self::TYPES[$type]);
    }

    /**
     * Les trois documents, déposés ou non, avec l'adresse pour les consulter.
     *
     * @param  callable(string): string  $url  adresse de consultation d'un type de document
     * @return list<array{type: string, label: string, uploaded: bool, kind: string|null, updated_at: string|null, url: string|null}>
     */
    public static function present(Company $company, callable $url): array
    {
        $disk = Storage::disk('local');

        return array_values(array_map(function (string $type) use ($company, $url, $disk) {
            [$column, $label] = self::TYPES[$type];
            $path = $company->{$column};
            $present = $path && $disk->exists($path);

            return [
                'type' => $type,
                'label' => $label,
                'uploaded' => (bool) $present,
                'kind' => $present ? (strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image') : null,
                'updated_at' => $present ? date('d/m/Y', $disk->lastModified($path)) : null,
                'url' => $present ? $url($type) : null,
            ];
        }, array_keys(self::TYPES)));
    }

    /**
     * Dépose (ou remplace) un document ; l'ancien fichier est effacé.
     */
    public static function store(Company $company, string $type, UploadedFile $file): void
    {
        [$column, $label] = self::TYPES[$type];
        $old = $company->{$column};

        $path = $file->store('onboarding/'.$company->id, 'local');
        $company->forceFill([$column => $path])->save();

        if ($old && $old !== $path) {
            Storage::disk('local')->delete($old);
        }

        AuditLog::record($old ? 'company.document_replaced' : 'company.document_uploaded', $company, new: ['document' => $label]);
    }

    /** Affiche le document dans le navigateur (image ou PDF). */
    public static function response(Company $company, string $type): StreamedResponse
    {
        $path = $company->{self::TYPES[$type][0]};
        abort_if(! $path || ! Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, basename($path), [
            'Content-Type' => Storage::disk('local')->mimeType($path) ?: 'application/octet-stream',
        ]);
    }
}
