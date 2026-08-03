<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Game\{
    RoomController,
    GameController,
    UserController,
    FriendController,
    ChatController,
    NotificationController,
};
use App\Http\Controllers\Api\V1\Admin\AdminController;

// ── Public routes ────────────────────────────────────────
Route::prefix('v1')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('register',         [AuthController::class, 'register']);
        Route::post('login',            [AuthController::class, 'login']);
        Route::post('guest',            [AuthController::class, 'guestLogin']);
        Route::post('forgot-password',  [AuthController::class, 'forgotPassword']);
        Route::post('reset-password',   [AuthController::class, 'resetPassword']);
        Route::get('social/{provider}/redirect',  [AuthController::class, 'socialRedirect']);
        Route::post('social/{provider}/callback', [AuthController::class, 'socialCallback']);
    });

    // Public leaderboard
    Route::get('leaderboard', [UserController::class, 'leaderboard']);

    // Public room listing & join by invite token
    Route::get('rooms',               [RoomController::class, 'index']);
    Route::get('rooms/{code}',        [RoomController::class, 'show']);
    Route::get('join/{token}',        [RoomController::class, 'joinByToken'])->middleware('auth:sanctum');

    // User profile (public)
    Route::get('users/{username}',    [UserController::class, 'profile']);
    Route::get('users/search',        [UserController::class, 'search']);

    // ── Authenticated routes ─────────────────────────────
    Route::middleware(['auth:sanctum', 'not_banned', 'update_last_seen'])->group(function () {

        // Auth
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me',      [AuthController::class, 'me']);

        // User
        Route::get('me/stats',          [UserController::class, 'stats']);
        Route::patch('me',              [UserController::class, 'updateProfile']);
        Route::post('me/avatar',        [UserController::class, 'uploadAvatar']);
        Route::post('me/password',      [UserController::class, 'changePassword']);
        Route::post('me/daily-reward',  [UserController::class, 'claimDailyReward']);

        // Friends
        Route::get('friends',                   [FriendController::class, 'index']);
        Route::get('friends/requests',          [FriendController::class, 'requests']);
        Route::post('friends/{userId}',         [FriendController::class, 'sendRequest']);
        Route::post('friends/requests/{id}/accept',  [FriendController::class, 'acceptRequest']);
        Route::post('friends/requests/{id}/decline', [FriendController::class, 'declineRequest']);
        Route::delete('friends/{userId}',       [FriendController::class, 'remove']);
        Route::post('friends/{userId}/invite',  [FriendController::class, 'inviteToRoom']);

        // Notifications
        Route::get('notifications',             [NotificationController::class, 'index']);
        Route::get('notifications/unread-count',[NotificationController::class, 'unreadCount']);
        Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('notifications/read-all',   [NotificationController::class, 'markAllRead']);

        // Rooms
        Route::post('rooms',                        [RoomController::class, 'store']);
        Route::post('rooms/{code}/join',            [RoomController::class, 'join']);
        Route::post('rooms/{code}/leave',           [RoomController::class, 'leave']);
        Route::post('rooms/{code}/ready',           [RoomController::class, 'ready']);
        Route::patch('rooms/{code}/settings',       [RoomController::class, 'updateSettings']);
        Route::delete('rooms/{code}/kick/{userId}', [RoomController::class, 'kick']);
        Route::post('rooms/{code}/ban/{userId}',    [RoomController::class, 'ban']);
        Route::post('rooms/{code}/transfer/{userId}',[RoomController::class, 'transferOwnership']);

        // Chat
        Route::get('rooms/{code}/chat',         [ChatController::class, 'index']);
        Route::post('rooms/{code}/chat',        [ChatController::class, 'store']);
        Route::delete('rooms/{code}/chat/{id}', [ChatController::class, 'delete']);

        // Game
        Route::post('rooms/{code}/start',           [GameController::class, 'start']);
        Route::get('games/{gameId}/state',          [GameController::class, 'state']);
        Route::post('games/{gameId}/play',          [GameController::class, 'playCard']);
        Route::post('games/{gameId}/draw',          [GameController::class, 'drawCard']);
        Route::post('games/{gameId}/uno',           [GameController::class, 'callUno']);
        Route::post('games/{gameId}/challenge-uno', [GameController::class, 'challengeUno']);
        Route::post('games/{gameId}/challenge-w4',  [GameController::class, 'challengeWildFour']);
        Route::get('games/history',                 [GameController::class, 'history']);

        // Admin
        Route::prefix('admin')->group(function () {
            Route::get('dashboard',             [AdminController::class, 'dashboard']);
            Route::get('users',                 [AdminController::class, 'users']);
            Route::post('users/{id}/ban',       [AdminController::class, 'banUser']);
            Route::delete('users/{id}/ban',     [AdminController::class, 'unbanUser']);
            Route::get('rooms',                 [AdminController::class, 'rooms']);
            Route::delete('rooms/{id}',         [AdminController::class, 'closeRoom']);
            Route::get('reports',               [AdminController::class, 'reports']);
            Route::patch('reports/{id}',        [AdminController::class, 'resolveReport']);
            Route::get('stats',                 [AdminController::class, 'stats']);
        });
    });
});
