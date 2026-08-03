<?php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\{Exceptions,Middleware};

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Register broadcast auth under /api/v1/broadcasting/auth
            // so the frontend Echo client (which prefixes all calls with /api/v1) hits the right URL.
            \Illuminate\Support\Facades\Broadcast::routes([
                'prefix'     => 'api/v1',
                'middleware' => ['api', 'auth:sanctum'],
            ]);
            require base_path('routes/channels.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
        $middleware->alias([
            'not_banned'       => \App\Http\Middleware\EnsureNotBanned::class,
            'update_last_seen' => \App\Http\Middleware\UpdateLastSeen::class,
        ]);
        $middleware->validateCsrfTokens(except: ['/api/*']);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->expectsJson()) return response()->json(['message'=>'Unauthenticated.'],401);
        });
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->expectsJson()) return response()->json(['message'=>'Validation failed.','errors'=>$e->errors()],422);
        });
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, $request) {
            if ($request->expectsJson()) return response()->json(['message'=>'Resource not found.'],404);
        });
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, $request) {
            if ($request->expectsJson()) return response()->json(['message'=>$e->getMessage()??'Error.'],$e->getStatusCode());
        });
    })->create();
