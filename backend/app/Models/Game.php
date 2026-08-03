<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo,HasMany,HasOne};
class Game extends Model {
    use HasFactory;
    protected $fillable=['room_id','game_number','status','winner_id','player_order','settings_snapshot','started_at','finished_at','total_moves','duration_seconds'];
    protected function casts():array{return['player_order'=>'array','settings_snapshot'=>'array','started_at'=>'datetime','finished_at'=>'datetime'];}
    public function room():BelongsTo{return $this->belongsTo(Room::class);}
    public function winner():BelongsTo{return $this->belongsTo(User::class,'winner_id');}
    public function players():HasMany{return $this->hasMany(GamePlayer::class);}
    public function rounds():HasMany{return $this->hasMany(Round::class);}
    public function currentRound():HasOne{return $this->hasOne(Round::class)->where('status','active')->latest();}
    public function moves():HasMany{return $this->hasMany(Move::class);}
}
