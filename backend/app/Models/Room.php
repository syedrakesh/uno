<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany, HasOne};
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Room extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code', 'name', 'owner_id', 'status', 'type', 'password',
        'max_players', 'min_players', 'allow_spectators', 'bot_count',
        'bot_difficulty', 'settings', 'turn_timer_seconds', 'rounds_to_win',
        'points_to_win', 'invite_token', 'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'settings'           => 'array',
            'allow_spectators'   => 'boolean',
            'last_activity_at'   => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (Room $room) {
            $room->code         = $room->code ?? strtoupper(Str::random(6));
            $room->invite_token = $room->invite_token ?? Str::random(64);
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(RoomPlayer::class);
    }

    public function activePlayers(): HasMany
    {
        return $this->hasMany(RoomPlayer::class)->whereIn('role', ['owner', 'player', 'bot']);
    }

    public function bans(): HasMany
    {
        return $this->hasMany(RoomBan::class);
    }

    public function games(): HasMany
    {
        return $this->hasMany(Game::class);
    }

    public function currentGame(): HasOne
    {
        return $this->hasOne(Game::class)->whereIn('status', ['waiting', 'active'])->latest();
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function getInviteUrlAttribute(): string
    {
        return config('app.frontend_url') . '/join/' . $this->invite_token;
    }

    public function getPlayerCountAttribute(): int
    {
        return $this->activePlayers()->count();
    }

    public function isPasswordProtected(): bool
    {
        return !empty($this->password);
    }

    public function isFull(): bool
    {
        return $this->player_count >= $this->max_players;
    }

    public function getDefaultSettings(): array
    {
        return [
            'stacking'            => false,
            'jump_in'             => false,
            'seven_zero_rule'     => false,
            'draw_until_can_play' => false,
            'force_play'          => true,
            'no_bluffing'         => false,
            'progressive_uno'     => false,
        ];
    }
}
