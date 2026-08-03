<?php
namespace App\Http\Controllers\Api\V1\Game;
use App\Http\Controllers\Controller;
use App\Models\{ChatMessage,Room};
use App\Events\ChatMessageSent;
use Illuminate\Http\{Request,JsonResponse};

class ChatController extends Controller {
    public function index(Request $request, string $code): JsonResponse {
        $room     = Room::where('code',$code)->firstOrFail();
        $messages = ChatMessage::with('user:id,name,username,avatar')
            ->where('room_id',$room->id)->where('is_deleted',false)
            ->orderByDesc('id')->paginate(50);
        return response()->json($messages);
    }

    public function store(Request $request, string $code): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $data = $request->validate(['message'=>'required|string|max:500|profanity_clean','type'=>'in:text,emoji']);
        $msg  = ChatMessage::create(['room_id'=>$room->id,'user_id'=>$request->user()->id,'type'=>$data['type']??'text','message'=>strip_tags($data['message'])]);
        $msg->load('user:id,name,username,avatar');
        broadcast(new ChatMessageSent($msg))->toOthers();
        return response()->json(['message'=>$msg],201);
    }

    public function delete(Request $request, string $code, int $messageId): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $msg  = ChatMessage::where('id',$messageId)->where('room_id',$room->id)->firstOrFail();
        if ($msg->user_id!==$request->user()->id && !$request->user()->isModerator())
            return response()->json(['message'=>'Unauthorized.'],403);
        $msg->update(['is_deleted'=>true,'deleted_at'=>now()]);
        return response()->json(['message'=>'Deleted.']);
    }
}
