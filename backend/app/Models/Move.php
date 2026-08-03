<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Move extends Model {
    protected $fillable=['round_id','game_id','user_id','move_number','action','card_played','chosen_color','cards_drawn','was_challenged','challenge_successful','time_taken_ms','played_at'];
    protected function casts():array{return['cards_drawn'=>'array','was_challenged'=>'boolean','challenge_successful'=>'boolean','played_at'=>'datetime'];}
    public function round():BelongsTo{return $this->belongsTo(Round::class);}
    public function game():BelongsTo{return $this->belongsTo(Game::class);}
    public function user():BelongsTo{return $this->belongsTo(User::class);}
}
