<?php
namespace App\Http\Controllers\Api\V1\Auth;
use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use App\Http\Resources\UserResource;
use Illuminate\Http\{Request, JsonResponse};
use Illuminate\Support\Facades\{Password, Hash, RateLimiter};
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller {
    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse {
        $data = $request->validate([
            'name'     => 'required|string|max:60',
            'username' => 'sometimes|string|max:32|min:3|unique:users|regex:/^[a-z0-9_]+$/',
            'email'    => 'required|email|unique:users|max:255',
            'password' => ['required','confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
        ]);
        $result = $this->authService->register($data);
        return response()->json(['user' => new UserResource($result['user']), 'token' => $result['token']], 201);
    }

    public function login(Request $request): JsonResponse {
        $key = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many login attempts. Try again later.'], 429);
        }
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string', 'remember' => 'boolean']);
        try {
            $result = $this->authService->login($data['email'], $data['password'], $data['remember'] ?? false);
            RateLimiter::clear($key);
            return response()->json(['user' => new UserResource($result['user']), 'token' => $result['token']]);
        } catch (\RuntimeException $e) {
            RateLimiter::hit($key, 60);
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 401);
        }
    }

    public function guestLogin(Request $request): JsonResponse {
        $result = $this->authService->loginAsGuest();
        return response()->json(['user' => new UserResource($result['user']), 'token' => $result['token']]);
    }

    public function logout(Request $request): JsonResponse {
        $request->user()->currentAccessToken()->delete();
        $request->user()->update(['status' => 'offline']);
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse {
        return response()->json(['user' => new UserResource($request->user()->load('stats'))]);
    }

    public function forgotPassword(Request $request): JsonResponse {
        $request->validate(['email' => 'required|email']);
        $status = Password::sendResetLink($request->only('email'));
        return response()->json(['message' => __($status)]);
    }

    public function resetPassword(Request $request): JsonResponse {
        $request->validate([
            'token'    => 'required',
            'email'    => 'required|email',
            'password' => ['required','confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
        ]);
        $status = Password::reset($request->only('email','password','password_confirmation','token'),
            function ($user, $password) { $user->update(['password' => Hash::make($password)]); $user->tokens()->delete(); }
        );
        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => 'Password reset successfully.'])
            : response()->json(['message' => __($status)], 422);
    }

    public function socialRedirect(string $provider): JsonResponse {
        $this->validateProvider($provider);
        $url = \Laravel\Socialite\Facades\Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();
        return response()->json(['url' => $url]);
    }

    public function socialCallback(Request $request, string $provider): JsonResponse {
        $this->validateProvider($provider);
        $request->validate(['token' => 'required|string']);
        try {
            $result = $this->authService->loginWithProvider($provider, $request->token);
            return response()->json(['user' => new UserResource($result['user']), 'token' => $result['token']]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    private function validateProvider(string $provider): void {
        if (!in_array($provider, ['google','github'])) abort(404, 'Provider not supported.');
    }
}
