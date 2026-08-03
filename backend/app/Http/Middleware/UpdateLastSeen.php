<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
class UpdateLastSeen {
    public function handle(Request $request, Closure $next) {
        if ($user = $request->user()) {
            $key = "last_seen:{$user->id}";
            if (!Cache::has($key)) {
                $user->update(['last_seen_at'=>now(),'status'=>'online']);
                Cache::put($key, true, 120);
            }
        }
        return $next($request);
    }
}
