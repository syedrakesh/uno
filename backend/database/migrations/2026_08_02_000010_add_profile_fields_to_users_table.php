<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 32)->unique()->nullable()->after('name');
            $table->string('avatar')->nullable()->after('email');
            $table->enum('role', ['admin', 'moderator', 'user'])->default('user')->after('avatar');
            $table->enum('status', ['online', 'offline', 'in_game', 'away'])->default('offline')->after('role');
            $table->unsignedBigInteger('xp')->default(0)->after('status');
            $table->unsignedInteger('level')->default(1)->after('xp');
            $table->unsignedInteger('coins')->default(100)->after('level');
            $table->boolean('is_guest')->default(false)->after('coins');
            $table->boolean('is_banned')->default(false)->after('is_guest');
            $table->text('ban_reason')->nullable()->after('is_banned');
            $table->timestamp('banned_until')->nullable()->after('ban_reason');
            $table->boolean('is_verified')->default(false)->after('banned_until');
            $table->string('preferred_language', 10)->default('en')->after('is_verified');
            $table->boolean('dark_mode')->default(true)->after('preferred_language');
            $table->boolean('sound_enabled')->default(true)->after('dark_mode');
            $table->boolean('notifications_enabled')->default(true)->after('sound_enabled');
            $table->string('timezone')->default('UTC')->after('notifications_enabled');
            $table->text('bio')->nullable()->after('timezone');
            $table->string('country', 2)->nullable()->after('bio');
            $table->timestamp('last_seen_at')->nullable()->after('country');
            $table->timestamp('last_daily_reward_at')->nullable()->after('last_seen_at');
            $table->unsignedInteger('consecutive_daily_days')->default(0)->after('last_daily_reward_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'username', 'avatar', 'role', 'status', 'xp', 'level', 'coins',
                'is_guest', 'is_banned', 'ban_reason', 'banned_until', 'is_verified',
                'preferred_language', 'dark_mode', 'sound_enabled', 'notifications_enabled',
                'timezone', 'bio', 'country', 'last_seen_at', 'last_daily_reward_at',
                'consecutive_daily_days',
            ]);
        });
    }
};
