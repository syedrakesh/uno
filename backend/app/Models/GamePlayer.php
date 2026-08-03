<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class GamePlayer extends Model {
    protected $fillable=['game_id','user_id','seat','type','status','score','finish_position','called_uno','cards_in_hand','xp_earned'];
    protected function casts():array{return['called_uno'=>'boolean'];}
    public function game():BelongsTo{return $this->belongsTo(Game::class);}
    public function user():BelongsTo{return $this->belongsTo(User::class);}
}
