<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('code', 8)->unique()->index();
            $table->string('name', 60);
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['waiting', 'starting', 'in_game', 'finished', 'closed'])->default('waiting');
            $table->enum('type', ['public', 'private', 'friends_only'])->default('public');
            $table->string('password')->nullable();
            $table->unsignedTinyInteger('max_players')->default(6);
            $table->unsignedTinyInteger('min_players')->default(2);
            $table->boolean('allow_spectators')->default(true);
            $table->unsignedTinyInteger('bot_count')->default(0);
            $table->enum('bot_difficulty', ['easy', 'medium', 'hard'])->default('medium');

            // Game settings stored as JSON
            $table->json('settings')->nullable(); // stacking, jump_in, 7_0_rule, draw_until_can_play, force_play, turn_timer, etc.

            $table->unsignedInteger('turn_timer_seconds')->default(30);
            $table->unsignedTinyInteger('rounds_to_win')->default(1);
            $table->unsignedInteger('points_to_win')->default(500);

            $table->string('invite_token', 64)->unique()->index();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'type']);
            $table->index('owner_id');
        });

        Schema::create('room_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['owner', 'player', 'spectator', 'bot'])->default('player');
            $table->boolean('is_ready')->default(false);
            $table->boolean('is_connected')->default(true);
            $table->unsignedTinyInteger('seat')->nullable(); // seat number 0-9
            $table->string('socket_id')->nullable();
            $table->timestamp('disconnected_at')->nullable();
            $table->timestamps();

            $table->unique(['room_id', 'user_id']);
            $table->index('user_id');
            $table->index('room_id');
        });

        Schema::create('room_bans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('banned_by')->constrained('users');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->unique(['room_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_bans');
        Schema::dropIfExists('room_players');
        Schema::dropIfExists('rooms');
    }
};
