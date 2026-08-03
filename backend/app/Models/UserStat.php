<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class UserStat extends Model {
    protected $fillable=['user_id','games_played','games_won','games_lost','rounds_played','rounds_won','cards_played','cards_drawn','uno_calls','successful_challenges','failed_challenges','total_score','best_score','longest_win_streak','current_win_streak','total_play_time_seconds','friends_count'];
    public function user():BelongsTo{return $this->belongsTo(User::class);}
}
