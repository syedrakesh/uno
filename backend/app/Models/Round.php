<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo,HasMany};
class Round extends Model {
    protected $fillable=['game_id','round_number','status','winner_id','current_player_id','direction','draw_pile','discard_pile','hands','top_card','current_color','pending_draw','turn_started_at'];
    protected function casts():array{return['draw_pile'=>'array','discard_pile'=>'array','hands'=>'array','turn_started_at'=>'datetime'];}
    public function game():BelongsTo{return $this->belongsTo(Game::class);}
    public function winner():BelongsTo{return $this->belongsTo(User::class,'winner_id');}
    public function currentPlayer():BelongsTo{return $this->belongsTo(User::class,'current_player_id');}
    public function moves():HasMany{return $this->hasMany(Move::class);}
}
