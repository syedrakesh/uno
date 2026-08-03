<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class EnsureNotBanned {
    public function handle(Request $request, Closure $next) {
        if ($request->user()?->isBannedNow()) {
            return response()->json(['message'=>'Your account has been banned.','ban_reason'=>$request->user()->ban_reason],403);
        }
        return $next($request);
    }
}
