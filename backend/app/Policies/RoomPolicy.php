<?php
namespace App\Policies;
use App\Models\{Room,User};
class RoomPolicy {
    public function manage(User $user, Room $room): bool {
        return $room->owner_id===$user->id || $user->isModerator();
    }
}
