<?php
namespace App\Http\Controllers\Api\V1\Game;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\{Request,JsonResponse};

class NotificationController extends Controller {
    public function index(Request $request): JsonResponse {
        $notifs = Notification::where('user_id',$request->user()->id)
            ->with('fromUser:id,name,username,avatar')
            ->orderByDesc('id')->paginate(30);
        return response()->json($notifs);
    }
    public function markRead(Request $request, int $id): JsonResponse {
        Notification::where('id',$id)->where('user_id',$request->user()->id)
            ->update(['is_read'=>true,'read_at'=>now()]);
        return response()->json(['message'=>'Marked read.']);
    }
    public function markAllRead(Request $request): JsonResponse {
        Notification::where('user_id',$request->user()->id)->where('is_read',false)
            ->update(['is_read'=>true,'read_at'=>now()]);
        return response()->json(['message'=>'All marked read.']);
    }
    public function unreadCount(Request $request): JsonResponse {
        $count = Notification::where('user_id',$request->user()->id)->where('is_read',false)->count();
        return response()->json(['count'=>$count]);
    }
}
