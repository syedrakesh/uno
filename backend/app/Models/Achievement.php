<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
class Achievement extends Model {
    protected $fillable=['key','name','description','icon','rarity','xp_reward','coin_reward','criteria','is_active'];
    protected function casts():array{return['criteria'=>'array','is_active'=>'boolean'];}
    public function users():BelongsToMany{return $this->belongsToMany(User::class,'user_achievements')->withPivot(['progress','is_unlocked','unlocked_at'])->withTimestamps();}
}
