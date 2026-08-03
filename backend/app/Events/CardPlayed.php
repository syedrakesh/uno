<?php
namespace App\Events;
use App\Models\Round;
use Illuminate\Broadcasting\{InteractsWithSockets,PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class CardPlayed implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public Round $round,public int $userId,public string $cardId,public ?string $chosenColor) {}
    public function broadcastOn(): array { return [new PrivateChannel('game.'.$this->round->game_id)]; }
    public function broadcastAs(): string { return 'card.played'; }
    public function broadcastWith(): array { return ['user_id'=>$this->userId,'card_id'=>$this->cardId,'chosen_color'=>$this->chosenColor]; }
}
