<?php
namespace App\Events;
use App\Models\ChatMessage;
use Illuminate\Broadcasting\{InteractsWithSockets,PresenceChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class ChatMessageSent implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public ChatMessage $message) {}
    public function broadcastOn(): array { return [new PresenceChannel('room.'.$this->message->room_id)]; }
    public function broadcastAs(): string { return 'chat.message'; }
    public function broadcastWith(): array {
        return ['id'=>$this->message->id,'user_id'=>$this->message->user_id,'user_name'=>$this->message->user?->name,'user_avatar'=>$this->message->user?->avatar_url,'type'=>$this->message->type,'message'=>$this->message->message,'created_at'=>$this->message->created_at->toISOString()];
    }
}
