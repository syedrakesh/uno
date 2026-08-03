<?php
namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\{InteractsWithSockets, PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerDeclaredUno implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Round $round,
        public int $userId
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('game.' . $this->round->game_id)];
    }

    public function broadcastAs(): string
    {
        return 'player.declared_uno';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
        ];
    }
}
