<?php
namespace App\Http\Controllers\Api\V1\Game;
use App\Http\Controllers\Controller;
use App\Models\{User,UserStat};
use App\Http\Resources\UserResource;
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\{Hash,Storage};
use Intervention\Image\Laravel\Facades\Image;

class UserController extends Controller {
    public function profile(Request $request, string $username): JsonResponse {
        $user = User::with('stats','achievements')->where('username',$username)->firstOrFail();
        return response()->json(['user'=>new UserResource($user)]);
    }

    public function updateProfile(Request $request): JsonResponse {
        $user = $request->user();
        $data = $request->validate([
            'name'                   => 'sometimes|string|max:60',
            'bio'                    => 'nullable|string|max:300',
            'country'                => 'nullable|string|size:2',
            'preferred_language'     => 'nullable|string|max:10',
            'dark_mode'              => 'boolean',
            'sound_enabled'          => 'boolean',
            'notifications_enabled'  => 'boolean',
            'timezone'               => 'nullable|string|max:50',
        ]);
        $user->update($data);
        return response()->json(['user'=>new UserResource($user->fresh())]);
    }

    public function uploadAvatar(Request $request): JsonResponse {
        $request->validate(['avatar'=>'required|image|mimes:jpg,jpeg,png,gif,webp|max:2048']);
        $user = $request->user();
        if ($user->avatar && !str_starts_with($user->avatar,'http')) Storage::disk('public')->delete($user->avatar);
        $path = $request->file('avatar')->store('avatars','public');
        $user->update(['avatar'=>$path]);
        return response()->json(['avatar_url'=>$user->fresh()->avatar_url]);
    }

    public function changePassword(Request $request): JsonResponse {
        $user = $request->user();
        $data = $request->validate(['current_password'=>'required|string','password'=>'required|confirmed|min:8']);
        if (!Hash::check($data['current_password'],$user->password))
            return response()->json(['message'=>'Current password is incorrect.'],422);
        $user->update(['password'=>Hash::make($data['password'])]);
        $user->tokens()->where('id','!=',$user->currentAccessToken()->id)->delete();
        return response()->json(['message'=>'Password changed successfully.']);
    }

    public function leaderboard(Request $request): JsonResponse {
        $type = $request->get('type','xp');
        $users = User::with('stats')->where('is_guest',false)->where('is_banned',false)
            ->when($type==='xp', fn($q)=>$q->orderByDesc('xp'))
            ->when($type==='wins', fn($q)=>$q->orderByDesc(UserStat::selectRaw('games_won')->whereColumn('user_stats.user_id','users.id')->limit(1)))
            ->limit(100)->get();
        return response()->json(['leaderboard'=>UserResource::collection($users),'type'=>$type]);
    }

    public function search(Request $request): JsonResponse {
        $q = $request->validate(['q'=>'required|string|min:2|max:32'])['q'];
        $users = User::where('is_guest',false)
            ->where(fn($query)=>$query->where('username','like',"%$q%")->orWhere('name','like',"%$q%"))
            ->select('id','name','username','avatar','status','level')->limit(20)->get();
        return response()->json(['users'=>$users->map(fn($u)=>array_merge($u->toArray(),['avatar_url'=>$u->avatar_url]))]);
    }

    public function stats(Request $request): JsonResponse {
        $user = $request->user()->load('stats','achievements');
        return response()->json(['stats'=>$user->stats,'achievements'=>$user->achievements,'win_rate'=>$user->win_rate]);
    }

    public function claimDailyReward(Request $request): JsonResponse {
        $user = $request->user();
        if ($user->last_daily_reward_at && $user->last_daily_reward_at->isToday())
            return response()->json(['message'=>'Already claimed today.'],422);
        $streak = $user->last_daily_reward_at && $user->last_daily_reward_at->isYesterday()
            ? $user->consecutive_daily_days + 1 : 1;
        $coins  = min(50 + ($streak-1)*10, 200);
        $xp     = min(25 + ($streak-1)*5, 100);
        $user->update(['last_daily_reward_at'=>now(),'consecutive_daily_days'=>$streak,'coins'=>$user->coins+$coins]);
        $user->addXp($xp);
        return response()->json(['coins'=>$coins,'xp'=>$xp,'streak'=>$streak,'message'=>"Day $streak reward claimed!"]);
    }
}
