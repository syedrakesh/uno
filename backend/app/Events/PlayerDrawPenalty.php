<?php
namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\{InteractsWithSockets, PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerDrawPenalty implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Round $round,
        public int $userId,
        public int $amount
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('game.' . $this->round->game_id)];
    }

    public function broadcastAs(): string
    {
        return 'player.draw_penalty';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'amount' => $this->amount,
        ];
    }
}
