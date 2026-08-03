<?php
namespace App\Events;
use App\Models\Round;
use Illuminate\Broadcasting\{InteractsWithSockets,PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class PlayerTurnChanged implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public Round $round, public int $nextPlayerId) {}
    public function broadcastOn(): array { return [new PrivateChannel('game.'.$this->round->game_id)]; }
    public function broadcastAs(): string { return 'turn.changed'; }
    public function broadcastWith(): array { return ['next_player_id'=>$this->nextPlayerId,'turn_started_at'=>now()->toISOString()]; }
}
