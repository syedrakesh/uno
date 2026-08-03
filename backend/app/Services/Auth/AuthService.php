<?php
namespace App\Services\Auth;
use App\Models\{User, UserStat, SocialAccount};
use Illuminate\Support\Facades\{Hash, Cache};
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthService {
    public function register(array $data): array {
        $user = User::create([
            'name'     => $data['name'],
            'username' => $data['username'] ?? $this->generateUsername($data['name']),
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'coins'    => 100,
        ]);
        UserStat::create(['user_id' => $user->id]);
        $user->sendEmailVerificationNotification();
        $token = $user->createToken('auth_token')->plainTextToken;
        return ['user' => $user, 'token' => $token];
    }

    public function login(string $email, string $password, bool $remember = false): array {
        $user = User::where('email', $email)->first();
        if (!$user || !Hash::check($password, $user->password)) {
            throw new \RuntimeException('Invalid credentials.', 401);
        }
        if ($user->isBannedNow()) throw new \RuntimeException('Account is banned.', 403);
        $user->update(['status' => 'online', 'last_seen_at' => now()]);
        $expiry = $remember ? now()->addDays(30) : now()->addDay();
        $token  = $user->createToken('auth_token', ['*'], $expiry)->plainTextToken;
        return ['user' => $user, 'token' => $token];
    }

    public function loginWithProvider(string $provider, string $code): array {
        $socialUser = Socialite::driver($provider)->stateless()->userFromToken($code);
        $social     = SocialAccount::firstOrNew(['provider' => $provider, 'provider_id' => $socialUser->getId()]);
        if ($social->exists) {
            $user = $social->user;
        } else {
            $user = User::firstOrCreate(['email' => $socialUser->getEmail()], [
                'name'       => $socialUser->getName(),
                'username'   => $this->generateUsername($socialUser->getName()),
                'avatar'     => $socialUser->getAvatar(),
                'is_verified'=> true,
                'email_verified_at' => now(),
                'coins'      => 100,
            ]);
            if (!$user->wasRecentlyCreated) {
                UserStat::firstOrCreate(['user_id' => $user->id]);
            }
            $social->fill(['user_id' => $user->id, 'provider_token' => $socialUser->token])->save();
        }
        if ($user->isBannedNow()) throw new \RuntimeException('Account is banned.', 403);
        $user->update(['status' => 'online', 'last_seen_at' => now()]);
        $token = $user->createToken('auth_token')->plainTextToken;
        return ['user' => $user, 'token' => $token];
    }

    public function loginAsGuest(): array {
        $user = User::create([
            'name'     => 'Guest_' . Str::upper(Str::random(6)),
            'username' => 'guest_' . Str::random(8),
            'email'    => 'guest_' . Str::random(12) . '@guest.local',
            'password' => Hash::make(Str::random(32)),
            'is_guest' => true,
            'coins'    => 0,
        ]);
        UserStat::create(['user_id' => $user->id]);
        $token = $user->createToken('guest_token', ['*'], now()->addHours(24))->plainTextToken;
        return ['user' => $user, 'token' => $token];
    }

    private function generateUsername(string $name): string {
        $base = Str::slug(Str::limit($name, 20, ''), '_');
        $base = preg_replace('/[^a-z0-9_]/', '', strtolower($base)) ?: 'player';
        $username = $base;
        $i = 1;
        while (User::where('username', $username)->exists()) {
            $username = $base . '_' . $i++;
        }
        return $username;
    }
}
