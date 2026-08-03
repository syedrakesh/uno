<?php
namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class UserResource extends JsonResource {
    public function toArray(Request $request): array {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'username'        => $this->username,
            'email'           => $this->when($request->user()?->id===$this->id||$request->user()?->isAdmin(),$this->email),
            'avatar_url'      => $this->avatar_url,
            'role'            => $this->role,
            'status'          => $this->status,
            'xp'              => $this->xp,
            'level'           => $this->level,
            'coins'           => $this->when($request->user()?->id===$this->id,$this->coins),
            'is_guest'        => $this->is_guest,
            'is_banned'       => $this->when($request->user()?->isAdmin(),$this->is_banned),
            'bio'             => $this->bio,
            'country'         => $this->country,
            'dark_mode'       => $this->when($request->user()?->id===$this->id,$this->dark_mode),
            'sound_enabled'   => $this->when($request->user()?->id===$this->id,$this->sound_enabled),
            'preferred_language'=>$this->when($request->user()?->id===$this->id,$this->preferred_language),
            'win_rate'        => $this->win_rate,
            'last_seen_at'    => $this->last_seen_at?->toISOString(),
            'email_verified'  => (bool)$this->email_verified_at,
            'stats'           => $this->whenLoaded('stats'),
            'achievements'    => $this->whenLoaded('achievements'),
            'created_at'      => $this->created_at->toISOString(),
        ];
    }
}
