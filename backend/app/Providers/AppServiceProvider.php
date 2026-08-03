<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Validator::extend('profanity_clean', function ($attribute, $value, $parameters, $validator) {
            $profanities = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'nigger', 'faggot', 'bastard', 'slut'];
            
            $normalizedValue = strtolower($value);
            foreach ($profanities as $word) {
                if (str_contains($normalizedValue, $word)) {
                    return false;
                }
            }
            return true;
        }, 'The :attribute contains inappropriate language.');
    }
}
