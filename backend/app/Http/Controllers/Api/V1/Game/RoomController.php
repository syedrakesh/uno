<?php
namespace App\Http\Controllers\Api\V1\Game;
use App\Http\Controllers\Controller;
use App\Models\{Room,RoomPlayer,RoomBan,User};
use App\Events\RoomUpdated;
use App\Http\Resources\{RoomResource,RoomCollection};
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\{Hash,Cache,DB};
use Illuminate\Support\Str;

class RoomController extends Controller {
    public function index(Request $request): JsonResponse {
        $rooms = Room::with(['owner:id,name,username,avatar','players'])
            ->where('status','waiting')
            ->where('type','public')
            ->when($request->search, fn($q,$s)=>$q->where('name','like',"%$s%"))
            ->withCount(['players as player_count'=>fn($q)=>$q->whereIn('role',['owner','player','bot'])])
            ->orderByDesc('last_activity_at')
            ->paginate(20);
        return response()->json($rooms);
    }

    public function store(Request $request): JsonResponse {
        $data = $request->validate([
            'name'               => 'required|string|max:60',
            'type'               => 'required|in:public,private,friends_only',
            'password'           => 'nullable|string|min:4|max:32',
            'max_players'        => 'integer|min:2|max:10',
            'min_players'        => 'integer|min:2|max:4',
            'allow_spectators'   => 'boolean',
            'bot_count'          => 'integer|min:0|max:9',
            'bot_difficulty'     => 'in:easy,medium,hard',
            'turn_timer_seconds' => 'integer|min:10|max:120',
            'rounds_to_win'      => 'integer|min:1|max:10',
            'points_to_win'      => 'integer|min:100|max:1000',
            'settings'           => 'nullable|array',
        ]);
        $user = $request->user();
        // Leave any current room first
        RoomPlayer::where('user_id',$user->id)->whereHas('room',fn($q)=>$q->whereIn('status',['waiting','in_game']))->delete();

        $room = Room::create(array_merge($data,[
            'owner_id' => $user->id,
            'password' => isset($data['password']) ? Hash::make($data['password']) : null,
            'settings' => array_merge((new Room)->getDefaultSettings(), $data['settings']??[]),
            'last_activity_at' => now(),
        ]));

        // Add owner as player
        RoomPlayer::create(['room_id'=>$room->id,'user_id'=>$user->id,'role'=>'owner','is_ready'=>true,'seat'=>0]);

        // Add bots
        for ($i = 0; $i < ($data['bot_count']??0); $i++) {
            $bot = User::where('is_guest',true)->where('username','like','bot_%')->inRandomOrder()->first()
                ?? User::create(['name'=>'Bot '.($i+1),'username'=>'bot_'.Str::random(6),'email'=>'bot_'.Str::random(8).'@bot.local','password'=>Hash::make(Str::random(32)),'is_guest'=>true]);
            RoomPlayer::create(['room_id'=>$room->id,'user_id'=>$bot->id,'role'=>'bot','is_ready'=>true,'seat'=>$i+1]);
        }

        broadcast(new RoomUpdated($room,'created'))->toOthers();
        return response()->json(['room'=>$room->load(['owner','players.user']),'message'=>'Room created.'],201);
    }

    public function show(string $code): JsonResponse {
        $room = Room::with(['owner:id,name,username,avatar','players.user:id,name,username,avatar,status,level'])
            ->where('code',$code)->firstOrFail();
        return response()->json(['room'=>$room]);
    }

    public function join(Request $request, string $code): JsonResponse {
        $data = $request->validate(['password'=>'nullable|string','role'=>'nullable|in:player,spectator']);
        $room = Room::where('code',$code)->firstOrFail();
        
        if ($room->status !== 'waiting') {
            return response()->json(['message'=>'Room is no longer accepting players.'],403);
        }
        $user = $request->user();

        if (RoomBan::where('room_id',$room->id)->where('user_id',$user->id)->exists())
            return response()->json(['message'=>'You are banned from this room.'],403);

        if ($room->isPasswordProtected() && !Hash::check($data['password']??'',$room->password))
            return response()->json(['message'=>'Incorrect room password.'],403);

        $role = $data['role']??'player';
        if ($role==='player' && $room->isFull())
            return response()->json(['message'=>'Room is full.'],422);

        $existing = RoomPlayer::where('room_id',$room->id)->where('user_id',$user->id)->first();
        if ($existing) {
            $existing->update(['is_connected'=>true,'disconnected_at'=>null]);
        } else {
            $seat = RoomPlayer::where('room_id',$room->id)->max('seat') + 1;
            RoomPlayer::create(['room_id'=>$room->id,'user_id'=>$user->id,'role'=>$role,'seat'=>$seat]);
        }
        $room->update(['last_activity_at'=>now()]);
        broadcast(new RoomUpdated($room,'player_joined',['user_id'=>$user->id]))->toOthers();
        return response()->json(['room'=>$room->fresh()->load(['owner','players.user']),'message'=>'Joined room.']);
    }

    public function joinByToken(Request $request, string $token): JsonResponse {
        $room = Room::where('invite_token',$token)->whereIn('status',['waiting'])->firstOrFail();
        return $this->join($request->merge(['code'=>$room->code]), $room->code);
    }

    public function leave(Request $request, string $code): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $user = $request->user();
        $player = RoomPlayer::where('room_id',$room->id)->where('user_id',$user->id)->first();
        if (!$player) return response()->json(['message'=>'Not in room.'],404);
        $player->delete();
        // Transfer ownership if needed
        if ($room->owner_id===$user->id) {
            $next = RoomPlayer::where('room_id',$room->id)->whereIn('role',['player'])->first();
            if ($next) { $next->update(['role'=>'owner']); $room->update(['owner_id'=>$next->user_id]); }
            else $room->update(['status'=>'closed']);
        }
        broadcast(new RoomUpdated($room,'player_left',['user_id'=>$user->id]))->toOthers();
        return response()->json(['message'=>'Left room.']);
    }

    public function kick(Request $request, string $code, int $userId): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $this->authorize('manage',$room);
        RoomPlayer::where('room_id',$room->id)->where('user_id',$userId)->delete();
        broadcast(new RoomUpdated($room,'player_kicked',['user_id'=>$userId]))->toOthers();
        return response()->json(['message'=>'Player kicked.']);
    }

    public function ban(Request $request, string $code, int $userId): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $this->authorize('manage',$room);
        $data = $request->validate(['reason'=>'nullable|string|max:255']);
        RoomPlayer::where('room_id',$room->id)->where('user_id',$userId)->delete();
        RoomBan::firstOrCreate(['room_id'=>$room->id,'user_id'=>$userId],['banned_by'=>$request->user()->id,'reason'=>$data['reason']??null]);
        broadcast(new RoomUpdated($room,'player_banned',['user_id'=>$userId]))->toOthers();
        return response()->json(['message'=>'Player banned from room.']);
    }

    public function ready(Request $request, string $code): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $player = RoomPlayer::where('room_id',$room->id)->where('user_id',$request->user()->id)->firstOrFail();
        $player->update(['is_ready'=>!$player->is_ready]);
        broadcast(new RoomUpdated($room,'player_ready',['user_id'=>$request->user()->id,'is_ready'=>$player->is_ready]))->toOthers();
        return response()->json(['is_ready'=>$player->is_ready]);
    }

    public function transferOwnership(Request $request, string $code, int $userId): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $this->authorize('manage',$room);
        DB::transaction(function() use($room,$userId,$request) {
            RoomPlayer::where('room_id',$room->id)->where('user_id',$room->owner_id)->update(['role'=>'player']);
            RoomPlayer::where('room_id',$room->id)->where('user_id',$userId)->update(['role'=>'owner']);
            $room->update(['owner_id'=>$userId]);
        });
        broadcast(new RoomUpdated($room,'ownership_transferred',['new_owner_id'=>$userId]))->toOthers();
        return response()->json(['message'=>'Ownership transferred.']);
    }

    public function updateSettings(Request $request, string $code): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $this->authorize('manage',$room);
        $data = $request->validate(['settings'=>'required|array','turn_timer_seconds'=>'integer|min:10|max:120','points_to_win'=>'integer|min:100|max:1000']);
        $room->update($data);
        broadcast(new RoomUpdated($room,'settings_updated'))->toOthers();
        return response()->json(['message'=>'Settings updated.','room'=>$room->fresh()]);
    }
}
