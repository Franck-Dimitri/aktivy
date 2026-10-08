<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Every demo account uses the password "password".
     */
    public function run(): void
    {
        User::factory()->superAdmin()->create([
            'name' => 'Super Admin',
            'email' => 'admin@aktivy.test',
        ]);

        $company = Company::factory()->create([
            'name' => 'Démo Distribution',
            'slug' => 'demo-distribution',
            'email' => 'contact@demo.test',
        ]);

        $users = [
            [Role::CompanyAdmin, 'Gérant Démo', 'gerant@demo.test', null],
            [Role::Supervisor, 'Superviseur Démo', 'superviseur@demo.test', null],
            [Role::Accountant, 'Comptable Démo', 'comptable@demo.test', null],
            [Role::FieldAgent, 'Hôtesse Démo', null, '+237690000001'],
        ];

        foreach ($users as [$role, $name, $email, $phone]) {
            User::factory()->for($company)->role($role)->create([
                'name' => $name,
                'email' => $email,
                'email_verified_at' => $email ? now() : null,
                'phone' => $phone,
            ]);
        }
    }
}
