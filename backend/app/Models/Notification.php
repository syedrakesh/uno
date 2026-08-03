<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Notification extends Model {
    protected $table='notifications';
    protected $fillable=['user_id','from_user_id','type','title','body','data','action_url','is_read','read_at'];
    protected function casts():array{return['data'=>'array','is_read'=>'boolean','read_at'=>'datetime'];}
    public function user():BelongsTo{return $this->belongsTo(User::class);}
    public function fromUser():BelongsTo{return $this->belongsTo(User::class,'from_user_id');}
}
