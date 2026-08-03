<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class RoomPlayer extends Model {
    protected $fillable=['room_id','user_id','role','is_ready','is_connected','seat','socket_id','disconnected_at'];
    protected function casts():array{return['is_ready'=>'boolean','is_connected'=>'boolean','disconnected_at'=>'datetime'];}
    public function room():BelongsTo{return $this->belongsTo(Room::class);}
    public function user():BelongsTo{return $this->belongsTo(User::class);}
}
