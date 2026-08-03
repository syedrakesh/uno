<?php
namespace App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Controller;
use App\Models\{User,Room,Game,Report,AuditLog};
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\{Cache,DB};

class AdminController extends Controller {
    public function __construct() { $this->middleware(fn($r,$n)=>$r->user()?->isAdmin() ? $n($r) : response()->json(['message'=>'Forbidden.'],403)); }

    public function dashboard(): JsonResponse {
        return response()->json(Cache::remember('admin_dashboard',60,fn()=>[
            'users'        => ['total'=>User::count(),'guests'=>User::where('is_guest',true)->count(),'banned'=>User::where('is_banned',true)->count(),'online'=>User::where('status','online')->count()],
            'rooms'        => ['total'=>Room::count(),'active'=>Room::where('status','in_game')->count(),'waiting'=>Room::where('status','waiting')->count()],
            'games'        => ['total'=>Game::count(),'today'=>Game::whereDate('created_at',today())->count()],
            'reports'      => ['pending'=>Report::where('status','pending')->count()],
        ]));
    }

    public function users(Request $request): JsonResponse {
        $users = User::with('stats')
            ->when($request->search,fn($q,$s)=>$q->where('name','like',"%$s%")->orWhere('email','like',"%$s%")->orWhere('username','like',"%$s%"))
            ->when($request->status,fn($q,$s)=>$q->where('status',$s))
            ->when($request->banned,fn($q)=>$q->where('is_banned',true))
            ->orderByDesc('created_at')->paginate(25);
        return response()->json($users);
    }

    public function banUser(Request $request, int $userId): JsonResponse {
        $data = $request->validate(['reason'=>'required|string|max:500','duration_days'=>'nullable|integer|min:1|max:365']);
        $user = User::findOrFail($userId);
        if ($user->isAdmin()) return response()->json(['message'=>'Cannot ban admin.'],403);
        $user->update(['is_banned'=>true,'ban_reason'=>$data['reason'],'banned_until'=>isset($data['duration_days'])?now()->addDays($data['duration_days']):null]);
        $user->tokens()->delete();
        return response()->json(['message'=>'User banned.']);
    }

    public function unbanUser(int $userId): JsonResponse {
        User::findOrFail($userId)->update(['is_banned'=>false,'ban_reason'=>null,'banned_until'=>null]);
        return response()->json(['message'=>'User unbanned.']);
    }

    public function rooms(Request $request): JsonResponse {
        $rooms = Room::with(['owner:id,name,username'])->withCount('players')
            ->when($request->status,fn($q,$s)=>$q->where('status',$s))
            ->orderByDesc('last_activity_at')->paginate(25);
        return response()->json($rooms);
    }

    public function closeRoom(int $roomId): JsonResponse {
        $room = Room::findOrFail($roomId);
        $room->update(['status'=>'closed']);
        return response()->json(['message'=>'Room closed.']);
    }

    public function reports(Request $request): JsonResponse {
        $reports = Report::with(['reporter:id,name,username','reported:id,name,username'])
            ->when($request->status,fn($q,$s)=>$q->where('status',$s))
            ->orderByDesc('created_at')->paginate(25);
        return response()->json($reports);
    }

    public function resolveReport(Request $request, int $reportId): JsonResponse {
        $data   = $request->validate(['status'=>'required|in:resolved,dismissed','admin_notes'=>'nullable|string|max:500']);
        $report = Report::findOrFail($reportId);
        $report->update(array_merge($data,['reviewed_by'=>$request->user()->id]));
        return response()->json(['message'=>'Report updated.']);
    }

    public function stats(): JsonResponse {
        return response()->json([
            'games_per_day' => Game::selectRaw('DATE(created_at) as date,COUNT(*) as count')->groupBy('date')->orderByDesc('date')->limit(30)->get(),
            'top_players'   => User::with('stats')->orderByDesc('xp')->limit(10)->get(),
            'room_types'    => Room::selectRaw('type,COUNT(*) as count')->groupBy('type')->get(),
        ]);
    }
}
