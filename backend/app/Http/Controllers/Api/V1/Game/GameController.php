<?php
namespace App\Http\Controllers\Api\V1\Game;
use App\Http\Controllers\Controller;
use App\Models\{Game,GamePlayer,Room,Round};
use App\Services\Game\UnoGameEngine;
use App\Events\RoomUpdated;
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\DB;

class GameController extends Controller {
    public function __construct(private UnoGameEngine $engine) {}

    public function start(Request $request, string $code): JsonResponse {
        $room = Room::where('code',$code)->firstOrFail();
        $this->authorize('manage',$room);
        $players = $room->activePlayers()->with('user')->get();
        if ($players->count() < $room->min_players)
            return response()->json(['message'=>"Need at least {$room->min_players} players."],422);
        if ($players->whereIn('role',['owner','player'])->where('is_ready',false)->count() > 0)
            return response()->json(['message'=>'All players must be ready.'],422);

        return DB::transaction(function() use($room,$players,$request) {
            $game = Game::create([
                'room_id'           => $room->id,
                'game_number'       => $room->games()->count()+1,
                'status'            => 'active',
                'player_order'      => $players->pluck('user_id')->shuffle()->values()->toArray(),
                'settings_snapshot' => array_merge($room->settings??[],$room->only(['turn_timer_seconds','rounds_to_win','points_to_win'])),
                'started_at'        => now(),
            ]);
            foreach($players as $i=>$rp) {
                GamePlayer::create(['game_id'=>$game->id,'user_id'=>$rp->user_id,'seat'=>$rp->seat,'type'=>$rp->role==='bot'?'bot':'human','status'=>'active']);
            }
            $room->update(['status'=>'in_game','last_activity_at'=>now()]);
            $round = $this->engine->startRound($game,1);
            broadcast(new RoomUpdated($room,'game_started',['game_id'=>$game->id]))->toOthers();
            return response()->json(['game'=>$game->load('players.user'),'round'=>$round,'message'=>'Game started.'],201);
        });
    }

    public function state(Request $request, int $gameId): JsonResponse {
        $game  = Game::with(['players.user:id,name,username,avatar','currentRound'])->findOrFail($gameId);
        $round = $game->currentRound;
        if (!$round) return response()->json(['game'=>$game,'round'=>null]);
        $state = $this->engine->getPublicState($round,$request->user()->id);
        return response()->json(['game'=>$game,'state'=>$state]);
    }

    public function nextRound(Request $request, int $gameId): JsonResponse {
        $game = Game::with('currentRound')->findOrFail($gameId);
        
        // Prevent starting if game is finished or round is still active
        if ($game->status === 'finished') return response()->json(['message'=>'Game is already over.'], 422);
        if ($game->currentRound && $game->currentRound->status === 'active') return response()->json(['message'=>'Current round is still active.'], 422);

        $nextRoundNumber = $game->currentRound ? $game->currentRound->round_number + 1 : 1;
        $round = $this->engine->startRound($game, $nextRoundNumber);
        
        broadcast(new \App\Events\GameStateUpdated($round))->toOthers();
        
        $state = $this->engine->getPublicState($round, $request->user()->id);
        return response()->json(['state'=>$state, 'message'=>'Next round started.']);
    }

    public function playCard(Request $request, int $gameId): JsonResponse {
        $data  = $request->validate(['card_id'=>'required|string','chosen_color'=>'nullable|in:red,green,blue,yellow']);
        $game  = Game::findOrFail($gameId);
        $round = $game->currentRound;
        if (!$round) return response()->json(['message'=>'No active round.'],422);
        try {
            $state = $this->engine->playCard($round,$request->user()->id,$data['card_id'],$data['chosen_color']??null);
            return response()->json(['state'=>$state]);
        } catch(\RuntimeException $e) {
            return response()->json(['message'=>$e->getMessage()],422);
        }
    }

    public function drawCard(Request $request, int $gameId): JsonResponse {
        $game  = Game::findOrFail($gameId);
        $round = $game->currentRound;
        if (!$round) return response()->json(['message'=>'No active round.'],422);
        try {
            $state = $this->engine->drawCard($round,$request->user()->id);
            return response()->json(['state'=>$state]);
        } catch(\RuntimeException $e) {
            return response()->json(['message'=>$e->getMessage()],422);
        }
    }

    public function callUno(Request $request, int $gameId): JsonResponse {
        $game  = Game::findOrFail($gameId);
        $round = $game->currentRound;
        $ok    = $this->engine->callUno($round,$request->user()->id);
        return response()->json(['success'=>$ok,'message'=>$ok?'UNO called!':'Cannot call UNO now.']);
    }

    public function challengeUno(Request $request, int $gameId): JsonResponse {
        $data  = $request->validate(['target_id'=>'required|integer']);
        $game  = Game::findOrFail($gameId);
        $round = $game->currentRound;
        $result= $this->engine->challengeUno($round,$request->user()->id,$data['target_id']);
        return response()->json($result);
    }

    public function challengeWildFour(Request $request, int $gameId): JsonResponse {
        $data  = $request->validate(['target_id'=>'required|integer']);
        $game  = Game::findOrFail($gameId);
        $round = $game->currentRound;
        $result= $this->engine->challengeWildDrawFour($round,$request->user()->id,$data['target_id']);
        return response()->json($result);
    }

    public function history(Request $request): JsonResponse {
        $games = Game::whereHas('players',fn($q)=>$q->where('user_id',$request->user()->id))
            ->with(['room:id,code,name','winner:id,name,username'])
            ->orderByDesc('created_at')->paginate(20);
        return response()->json($games);
    }
}
