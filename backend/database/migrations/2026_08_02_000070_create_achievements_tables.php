<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('key', 64)->unique();
            $table->string('name', 100);
            $table->text('description');
            $table->string('icon', 100)->nullable();
            $table->enum('rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary'])->default('common');
            $table->unsignedInteger('xp_reward')->default(0);
            $table->unsignedInteger('coin_reward')->default(0);
            $table->json('criteria')->nullable(); // e.g. {type: "games_won", value: 10}
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('key');
            $table->index('rarity');
        });

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('progress')->default(0); // current progress toward criteria
            $table->boolean('is_unlocked')->default(false);
            $table->timestamp('unlocked_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'achievement_id']);
            $table->index('user_id');
        });

        Schema::create('user_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->unsignedInteger('games_played')->default(0);
            $table->unsignedInteger('games_won')->default(0);
            $table->unsignedInteger('games_lost')->default(0);
            $table->unsignedInteger('rounds_played')->default(0);
            $table->unsignedInteger('rounds_won')->default(0);
            $table->unsignedInteger('cards_played')->default(0);
            $table->unsignedInteger('cards_drawn')->default(0);
            $table->unsignedInteger('uno_calls')->default(0);
            $table->unsignedInteger('successful_challenges')->default(0);
            $table->unsignedInteger('failed_challenges')->default(0);
            $table->unsignedBigInteger('total_score')->default(0);
            $table->unsignedInteger('best_score')->default(0);
            $table->unsignedInteger('longest_win_streak')->default(0);
            $table->unsignedInteger('current_win_streak')->default(0);
            $table->unsignedInteger('total_play_time_seconds')->default(0);
            $table->unsignedInteger('friends_count')->default(0);
            $table->timestamps();

            $table->index(['games_won', 'xp_earned' => 'user_id']); // for leaderboard queries
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_stats');
        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('achievements');
    }
};
