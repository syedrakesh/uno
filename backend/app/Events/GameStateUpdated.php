<?php
namespace App\Events;
use App\Models\Round;
use Illuminate\Broadcasting\{Channel,InteractsWithSockets,PresenceChannel,PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class GameStateUpdated implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public Round $round) {}
    public function broadcastOn(): array { return [new PrivateChannel('game.'.$this->round->game_id)]; }
    public function broadcastAs(): string { return 'game.state.updated'; }
    public function broadcastWith(): array {
        return ['round_id'=>$this->round->id,'top_card'=>$this->round->top_card,'current_color'=>$this->round->current_color,'current_player_id'=>$this->round->current_player_id,'direction'=>$this->round->direction,'pending_draw'=>$this->round->pending_draw,'draw_pile_count'=>count($this->round->draw_pile??[]),'status'=>$this->round->status];
    }
}
