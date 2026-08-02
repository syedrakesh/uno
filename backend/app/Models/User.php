<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\{BelongsToMany, HasMany, HasOne};
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name', 'username', 'email', 'password', 'avatar', 'role', 'status',
        'xp', 'level', 'coins', 'is_guest', 'is_banned', 'ban_reason',
        'banned_until', 'is_verified', 'preferred_language', 'dark_mode',
        'sound_enabled', 'notifications_enabled', 'timezone', 'bio', 'country',
        'last_seen_at', 'last_daily_reward_at', 'consecutive_daily_days',
        'email_verified_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_guest'          => 'boolean',
            'is_banned'         => 'boolean',
            'is_verified'       => 'boolean',
            'dark_mode'         => 'boolean',
            'sound_enabled'     => 'boolean',
            'notifications_enabled' => 'boolean',
            'banned_until'      => 'datetime',
            'last_seen_at'      => 'datetime',
            'last_daily_reward_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }

    public function stats(): HasOne
    {
        return $this->hasOne(UserStat::class);
    }

    public function achievements(): BelongsToMany
    {
        return $this->belongsToMany(Achievement::class, 'user_achievements')
            ->withPivot(['progress', 'is_unlocked', 'unlocked_at'])
            ->withTimestamps();
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function friendRequests(): HasMany
    {
        return $this->hasMany(FriendRequest::class, 'sender_id');
    }

    public function receivedFriendRequests(): HasMany
    {
        return $this->hasMany(FriendRequest::class, 'receiver_id');
    }

    public function friends(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'friends', 'user_id', 'friend_id')
            ->withPivot('is_favorite')
            ->withTimestamps();
    }

    public function ownedRooms(): HasMany
    {
        return $this->hasMany(Room::class, 'owner_id');
    }

    public function roomPlayers(): HasMany
    {
        return $this->hasMany(RoomPlayer::class);
    }

    public function gamePlayers(): HasMany
    {
        return $this->hasMany(GamePlayer::class);
    }

    // ─── Computed Attributes ──────────────────────────────

    public function getAvatarUrlAttribute(): string
    {
        if ($this->avatar) {
            return str_starts_with($this->avatar, 'http')
                ? $this->avatar
                : asset('storage/' . $this->avatar);
        }
        return 'https://ui-avatars.com/api/?name=' . urlencode($this->name) . '&background=6366f1&color=fff&size=128';
    }

    public function getWinRateAttribute(): float
    {
        $stats = $this->stats;
        if (!$stats || $stats->games_played === 0) return 0;
        return round(($stats->games_won / $stats->games_played) * 100, 2);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isModerator(): bool
    {
        return in_array($this->role, ['admin', 'moderator']);
    }

    public function isBannedNow(): bool
    {
        if (!$this->is_banned) return false;
        if ($this->banned_until && $this->banned_until->isPast()) {
            $this->update(['is_banned' => false, 'banned_until' => null]);
            return false;
        }
        return true;
    }

    public function addXp(int $amount): void
    {
        $this->increment('xp', $amount);
        $this->stats?->increment('xp', $amount);

        // Level up logic: level = floor(sqrt(xp / 100)) + 1
        $newLevel = (int) floor(sqrt($this->fresh()->xp / 100)) + 1;
        if ($newLevel > $this->level) {
            $this->update(['level' => $newLevel]);
        }
    }
}
