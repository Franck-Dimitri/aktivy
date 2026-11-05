<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use App\Notifications\LiveNotification;
use App\Support\Notifications\Notify;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
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
        // Normalisé avant validation, pour comparer le numéro tel qu'il est enregistré
        $input['phone'] = PhoneNumber::normalize($input['phone'] ?? null);

        Validator::make($input, [
            'company_name' => ['required', 'string', 'max:255'],
            ...$this->profileRules(),
            'phone'    => ['nullable', 'string', 'max:20', Rule::unique(User::class)],
            'password' => $this->passwordRules(),
        ])->validate();

        return DB::transaction(function () use ($input) {
            $company = Company::create([
                'name'   => $input['company_name'],
                'slug'   => Company::uniqueSlug($input['company_name']),
                'email'  => $input['email'],
                'status' => 'pending',
            ]);

            $user = $company->users()->create([
                'role'     => Role::CompanyAdmin,
                'name'     => $input['name'],
                'email'    => $input['email'],
                'phone'    => $input['phone'] ?? null,
                'password' => $input['password'],
            ]);

            AuditLog::record('company.registered', $company, new: ['name' => $company->name], actor: $user);

            // Le super-admin voit arriver les nouveaux comptes (envoyé une fois la transaction validée)
            $admins = User::where('role', Role::SuperAdmin)->where('status', AccountStatus::Active)->get();
            if ($admins->isNotEmpty()) {
                Notify::send($admins, LiveNotification::companyRegistered($company, $user));
            }

            return $user;
        });
    }
}
