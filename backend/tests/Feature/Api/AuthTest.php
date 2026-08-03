<?php
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user can register', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name'                  => 'Test User',
        'email'                 => 'test@example.com',
        'password'              => 'Password1',
        'password_confirmation' => 'Password1',
    ]);
    $response->assertStatus(201)->assertJsonStructure(['user','token']);
});

test('user cannot register with duplicate email', function () {
    User::factory()->create(['email' => 'test@example.com']);
    $this->postJson('/api/v1/auth/register', [
        'name'=>'T','email'=>'test@example.com','password'=>'Password1','password_confirmation'=>'Password1',
    ])->assertStatus(422);
});

test('user can login', function () {
    User::factory()->create(['email'=>'login@test.com','password'=>bcrypt('Password1')]);
    $this->postJson('/api/v1/auth/login',['email'=>'login@test.com','password'=>'Password1'])
        ->assertOk()->assertJsonStructure(['user','token']);
});

test('login fails with wrong password', function () {
    User::factory()->create(['email'=>'wrong@test.com','password'=>bcrypt('Password1')]);
    $this->postJson('/api/v1/auth/login',['email'=>'wrong@test.com','password'=>'WrongPass'])
        ->assertStatus(401);
});

test('authenticated user can get profile', function () {
    $user  = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $this->withHeader('Authorization',"Bearer $token")->getJson('/api/v1/auth/me')
        ->assertOk()->assertJsonStructure(['user']);
});

test('guest login returns token', function () {
    $this->postJson('/api/v1/auth/guest')->assertOk()->assertJsonStructure(['user','token']);
});
