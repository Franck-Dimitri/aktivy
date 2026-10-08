<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->restrictOnDelete();
            $table->string('role')->after('company_id')->index();
            $table->string('email')->nullable()->change();
            $table->string('phone', 20)->nullable()->unique()->after('email');
            $table->boolean('must_change_password')->default(false)->after('password');
            $table->string('status')->default('active')->after('must_change_password')->index();
            $table->string('locale', 5)->default('fr')->after('status');
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->softDeletes();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_email_or_phone_check CHECK (email IS NOT NULL OR phone IS NOT NULL)');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_company_matches_role_check CHECK ((role = 'super_admin') = (company_id IS NULL))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_or_phone_check');
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_matches_role_check');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
            $table->dropColumn([
                'role', 'phone', 'must_change_password', 'status', 'locale',
                'last_login_at', 'last_login_ip', 'deleted_at',
            ]);
            $table->string('email')->nullable(false)->change();
        });
    }
};
