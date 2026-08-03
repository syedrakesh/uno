<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ChatMessage extends Model {
    protected $fillable=['room_id','user_id','type','message','is_deleted'];
    protected function casts():array{return['is_deleted'=>'boolean'];}
    public function room():BelongsTo{return $this->belongsTo(Room::class);}
    public function user():BelongsTo{return $this->belongsTo(User::class);}
}
