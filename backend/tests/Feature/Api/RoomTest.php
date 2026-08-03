<?php
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAsUser() {
    $user  = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    return [test()->withHeader('Authorization',"Bearer $token"), $user];
}

test('can list public rooms', function () {
    $this->getJson('/api/v1/rooms')->assertOk()->assertJsonStructure(['data']);
});

test('authenticated user can create room', function () {
    [$client] = actingAsUser();
    $client->postJson('/api/v1/rooms',['name'=>'Test Room','type'=>'public','max_players'=>4])
        ->assertStatus(201)->assertJsonStructure(['room','message']);
});

test('unauthenticated cannot create room', function () {
    $this->postJson('/api/v1/rooms',['name'=>'X','type'=>'public'])->assertStatus(401);
});
