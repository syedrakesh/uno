<?php
namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\{InteractsWithSockets, PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerUnoCaught implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Round $round,
        public int $targetId,
        public int $challengerId
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('game.' . $this->round->game_id)];
    }

    public function broadcastAs(): string
    {
        return 'player.uno_caught';
    }

    public function broadcastWith(): array
    {
        return [
            'target_id' => $this->targetId,
            'challenger_id' => $this->challengerId,
        ];
    }
}
