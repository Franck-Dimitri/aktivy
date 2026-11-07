<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ProfileDeleteRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }

    /**
     * Le seul gérant d'une entreprise (ou le dernier administrateur) ne peut pas supprimer son compte :
     * l'interface ne propose pas le bouton, et le serveur refuse aussi la demande.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($reason = $this->user()?->selfDeletionBlocker()) {
                    $validator->errors()->add('account', $reason);
                }
            },
        ];
    }
}
