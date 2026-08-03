<?php
namespace App\Events;
use App\Models\Room;
use Illuminate\Broadcasting\{InteractsWithSockets,PresenceChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class RoomUpdated implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public Room $room, public string $event='updated', public array $extra=[]) {}
    public function broadcastOn(): array { return [new PresenceChannel('room.'.$this->room->id)]; }
    public function broadcastAs(): string { return 'room.'.$this->event; }
    public function broadcastWith(): array { return array_merge(['room_id'=>$this->room->id,'status'=>$this->room->status,'type'=>$this->event], $this->extra); }
}
