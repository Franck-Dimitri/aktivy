<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Users who log in with their phone number may leave their email empty.
        return [
            ...$this->profileRules($this->user()->id, emailRequired: $this->user()->phone === null),
            // Nouvelle adresse e-mail : mot de passe actuel exigé. Sinon, une session volée (téléphone
            // partagé…) suffisait à changer l'adresse puis à réinitialiser le mot de passe.
            'current_password' => [Rule::requiredIf(fn () => $this->emailChanges()), 'nullable', 'string', 'current_password'],
        ];
    }

    private function emailChanges(): bool
    {
        return mb_strtolower(trim((string) $this->input('email'))) !== mb_strtolower((string) $this->user()->email);
    }
}
