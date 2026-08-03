<?php
namespace App\Events;
use App\Models\Game;
use Illuminate\Broadcasting\{InteractsWithSockets,PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class GameEnded implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public Game $game, public int $winnerId) {}
    public function broadcastOn(): array { return [new PrivateChannel('game.'.$this->game->id)]; }
    public function broadcastAs(): string { return 'game.ended'; }
    public function broadcastWith(): array {
        $this->game->load(['players.user:id,name,username,avatar']);
        $players = $this->game->players->map(fn($p) => [
            'user_id'         => $p->user_id,
            'name'            => $p->user->name ?? 'Player',
            'username'        => $p->user->username ?? '',
            'avatar'          => $p->user->avatar ?? null,
            'score'           => $p->score,
            'xp_earned'       => $p->xp_earned,
            'finish_position' => $p->finish_position,
        ]);
        return [
            'game_id'          => $this->game->id,
            'winner_id'        => $this->winnerId,
            'finished_at'      => now()->toISOString(),
            'duration_seconds' => $this->game->duration_seconds,
            'players'          => $players,
        ];
    }
}
