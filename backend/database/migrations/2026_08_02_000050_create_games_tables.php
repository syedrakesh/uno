<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('game_number')->default(1); // within room session
            $table->enum('status', ['waiting', 'active', 'paused', 'finished', 'aborted'])->default('waiting');
            $table->foreignId('winner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('player_order')->nullable(); // array of user_ids in turn order
            $table->json('settings_snapshot')->nullable(); // snapshot of rules when game started
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('total_moves')->default(0);
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamps();

            $table->index(['room_id', 'status']);
            $table->index('winner_id');
        });

        Schema::create('game_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('seat'); // position in game
            $table->enum('type', ['human', 'bot'])->default('human');
            $table->enum('status', ['active', 'disconnected', 'left', 'finished'])->default('active');
            $table->unsignedInteger('score')->default(0); // points scored in this game
            $table->unsignedTinyInteger('finish_position')->nullable(); // 1st, 2nd, etc.
            $table->boolean('called_uno')->default(false);
            $table->unsignedTinyInteger('cards_in_hand')->default(0); // current hand size
            $table->unsignedInteger('xp_earned')->default(0);
            $table->timestamps();

            $table->unique(['game_id', 'user_id']);
            $table->index('game_id');
            $table->index('user_id');
        });

        Schema::create('rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('round_number');
            $table->enum('status', ['active', 'finished'])->default('active');
            $table->foreignId('winner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('current_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('direction', ['clockwise', 'counterclockwise'])->default('clockwise');
            $table->json('draw_pile')->nullable(); // encoded card list
            $table->json('discard_pile')->nullable(); // encoded card list
            $table->json('hands')->nullable(); // {user_id: [card, card, ...]}
            $table->string('top_card')->nullable(); // current top of discard
            $table->string('current_color')->nullable(); // active color (after wild)
            $table->unsignedInteger('pending_draw')->default(0); // stacked draw count
            $table->timestamp('turn_started_at')->nullable();
            $table->timestamps();

            $table->index(['game_id', 'round_number']);
        });

        Schema::create('moves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('move_number');
            $table->enum('action', [
                'play_card', 'draw_card', 'draw_penalty', 'skip', 'reverse',
                'call_uno', 'challenge_uno', 'challenge_wild4', 'pass', 'timeout'
            ]);
            $table->string('card_played')->nullable(); // e.g. "red_7", "wild_draw4"
            $table->string('chosen_color')->nullable(); // when wild is played
            $table->json('cards_drawn')->nullable(); // cards drawn in this move
            $table->boolean('was_challenged')->default(false);
            $table->boolean('challenge_successful')->default(false);
            $table->unsignedInteger('time_taken_ms')->nullable();
            $table->timestamp('played_at');
            $table->timestamps();

            $table->index(['round_id', 'move_number']);
            $table->index('game_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moves');
        Schema::dropIfExists('rounds');
        Schema::dropIfExists('game_players');
        Schema::dropIfExists('games');
    }
};
