<?php
namespace App\Http\Controllers\Api\V1\Game;
use App\Http\Controllers\Controller;
use App\Models\{FriendRequest,Friend,Notification,User};
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\DB;

class FriendController extends Controller {
    public function index(Request $request): JsonResponse {
        $friends = $request->user()->friends()->with('stats')->get();
        return response()->json(['friends'=>$friends->map(fn($f)=>['id'=>$f->id,'name'=>$f->name,'username'=>$f->username,'avatar_url'=>$f->avatar_url,'status'=>$f->status,'level'=>$f->level,'is_favorite'=>$f->pivot->is_favorite])]);
    }

    public function sendRequest(Request $request, int $userId): JsonResponse {
        $user   = $request->user();
        if ($user->id===$userId) return response()->json(['message'=>'Cannot add yourself.'],422);
        $target = User::findOrFail($userId);
        if ($user->friends()->where('friend_id',$userId)->exists())
            return response()->json(['message'=>'Already friends.'],422);
        $existing = FriendRequest::where(fn($q)=>$q->where(['sender_id'=>$user->id,'receiver_id'=>$userId])->orWhere(['sender_id'=>$userId,'receiver_id'=>$user->id]))->first();
        if ($existing) return response()->json(['message'=>'Request already exists.'],422);
        FriendRequest::create(['sender_id'=>$user->id,'receiver_id'=>$userId,'status'=>'pending']);
        Notification::create(['user_id'=>$userId,'from_user_id'=>$user->id,'type'=>'friend_request','title'=>'Friend Request','body'=>"{$user->name} sent you a friend request.",'data'=>['from_user_id'=>$user->id]]);
        return response()->json(['message'=>'Friend request sent.'],201);
    }

    public function acceptRequest(Request $request, int $requestId): JsonResponse {
        $fr   = FriendRequest::where('id',$requestId)->where('receiver_id',$request->user()->id)->firstOrFail();
        DB::transaction(function() use($fr,$request) {
            $fr->update(['status'=>'accepted']);
            Friend::firstOrCreate(['user_id'=>$fr->sender_id,'friend_id'=>$fr->receiver_id]);
            Friend::firstOrCreate(['user_id'=>$fr->receiver_id,'friend_id'=>$fr->sender_id]);
            Notification::create(['user_id'=>$fr->sender_id,'from_user_id'=>$fr->receiver_id,'type'=>'friend_accepted','title'=>'Friend Request Accepted','body'=>"{$request->user()->name} accepted your friend request."]);
        });
        return response()->json(['message'=>'Friend request accepted.']);
    }

    public function declineRequest(Request $request, int $requestId): JsonResponse {
        $fr = FriendRequest::where('id',$requestId)->where('receiver_id',$request->user()->id)->firstOrFail();
        $fr->update(['status'=>'declined']);
        return response()->json(['message'=>'Request declined.']);
    }

    public function remove(Request $request, int $userId): JsonResponse {
        DB::transaction(function() use($request,$userId) {
            Friend::where(['user_id'=>$request->user()->id,'friend_id'=>$userId])->delete();
            Friend::where(['user_id'=>$userId,'friend_id'=>$request->user()->id])->delete();
        });
        return response()->json(['message'=>'Friend removed.']);
    }

    public function requests(Request $request): JsonResponse {
        $requests = FriendRequest::where('receiver_id',$request->user()->id)->where('status','pending')
            ->with('sender:id,name,username,avatar')->get();
        return response()->json(['requests'=>$requests->map(fn($r)=>['id'=>$r->id,'sender'=>['id'=>$r->sender->id,'name'=>$r->sender->name,'username'=>$r->sender->username,'avatar_url'=>$r->sender->avatar_url],'created_at'=>$r->created_at])]);
    }

    public function inviteToRoom(Request $request, int $userId): JsonResponse {
        $data = $request->validate(['room_code'=>'required|string']);
        Notification::create(['user_id'=>$userId,'from_user_id'=>$request->user()->id,'type'=>'room_invite','title'=>'Room Invite','body'=>"{$request->user()->name} invited you to join a game.",'data'=>['room_code'=>$data['room_code']],'action_url'=>'/room/'.$data['room_code']]);
        return response()->json(['message'=>'Invite sent.']);
    }
}
