#!/bin/bash

# Kill all child processes when Ctrl+C is pressed
cleanup() {
    echo "Stopping all servers..."
    kill 0
}

trap cleanup EXIT

echo "Starting Laravel..."
(
    cd backend
    php artisan serve --host=0.0.0.0 --port=8000
) &

echo "Starting Reverb..."
(
    cd backend
    php artisan reverb:start --host=0.0.0.0 --port=8080
) &

echo "Starting Vite..."
(
    cd backend
    npm run dev -- --host
) &

echo "Starting Next.js..."
(
    cd frontend
    npm run dev -- --hostname 0.0.0.0
) &

wait