<?php
use Illuminate\Support\Facades\Broadcast;
use App\Models\{Room,RoomPlayer,GamePlayer,Game};

// Private game channel — only players in the game
Broadcast::channel('game.{gameId}', function ($user, $gameId) {
    return GamePlayer::where('game_id',$gameId)->where('user_id',$user->id)->exists();
});

// Presence room channel — all players & spectators in room
Broadcast::channel('room.{roomId}', function ($user, $roomId) {
    $player = RoomPlayer::where('room_id',$roomId)->where('user_id',$user->id)->first();
    if (!$player) return false;
    return ['id'=>$user->id,'name'=>$user->name,'username'=>$user->username,'avatar_url'=>$user->avatar_url,'role'=>$player->role,'status'=>$user->status];
});

// Private user notification channel
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int)$user->id === (int)$userId;
});
