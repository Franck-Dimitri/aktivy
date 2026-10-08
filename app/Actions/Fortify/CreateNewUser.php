<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Register a new client company along with its first administrator.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $input['email'] = Str::lower($input['email'] ?? '');

        Validator::make($input, [
            'company_name' => ['required', 'string', 'max:255'],
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        return DB::transaction(function () use ($input) {
            $company = Company::create([
                'name' => $input['company_name'],
                'slug' => Company::uniqueSlug($input['company_name']),
                'email' => $input['email'],
            ]);

            $user = $company->users()->create([
                'role' => Role::CompanyAdmin,
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
            ]);

            AuditLog::record('company.registered', $company, new: ['name' => $company->name], actor: $user);

            return $user;
        });
    }
}
