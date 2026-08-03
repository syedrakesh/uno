<?php
namespace Database\Seeders;
use App\Models\{User,UserStat,Achievement,Room,RoomPlayer};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder {
    public function run(): void {
        // Admin user
        $admin = User::firstOrCreate(['email'=>'admin@uno.com'],['name'=>'Admin','username'=>'admin','password'=>Hash::make('Admin@1234'),'role'=>'admin','is_verified'=>true,'email_verified_at'=>now(),'xp'=>9999,'level'=>10,'coins'=>9999]);
        UserStat::firstOrCreate(['user_id'=>$admin->id]);

        // Demo players
        for($i=1;$i<=10;$i++){
            $user = User::firstOrCreate(['email'=>"player{$i}@uno.com"],['name'=>"Player {$i}",'username'=>"player{$i}",'password'=>Hash::make('Player@1234'),'is_verified'=>true,'email_verified_at'=>now(),'xp'=>rand(100,5000),'level'=>rand(1,20),'coins'=>rand(50,500)]);
            UserStat::firstOrCreate(['user_id'=>$user->id],['games_played'=>rand(5,100),'games_won'=>rand(1,50)]);
        }

        // Achievements
        $achievements = [
            ['key'=>'first_win','name'=>'First Victory','description'=>'Win your first game','icon'=>'trophy','rarity'=>'common','xp_reward'=>50,'criteria'=>['type'=>'games_won','value'=>1]],
            ['key'=>'win_10','name'=>'Getting Serious','description'=>'Win 10 games','icon'=>'star','rarity'=>'uncommon','xp_reward'=>150,'criteria'=>['type'=>'games_won','value'=>10]],
            ['key'=>'win_50','name'=>'Champion','description'=>'Win 50 games','icon'=>'crown','rarity'=>'rare','xp_reward'=>500,'criteria'=>['type'=>'games_won','value'=>50]],
            ['key'=>'uno_master','name'=>'UNO Master','description'=>'Call UNO 100 times','icon'=>'bolt','rarity'=>'uncommon','xp_reward'=>200,'criteria'=>['type'=>'uno_calls','value'=>100]],
            ['key'=>'challenger','name'=>'Challenger','description'=>'Successfully challenge 10 times','icon'=>'shield','rarity'=>'rare','xp_reward'=>300,'criteria'=>['type'=>'successful_challenges','value'=>10]],
            ['key'=>'social_butterfly','name'=>'Social Butterfly','description'=>'Add 10 friends','icon'=>'users','rarity'=>'uncommon','xp_reward'=>100,'criteria'=>['type'=>'friends_count','value'=>10]],
            ['key'=>'marathon','name'=>'Marathon Player','description'=>'Play 100 games','icon'=>'activity','rarity'=>'rare','xp_reward'=>400,'criteria'=>['type'=>'games_played','value'=>100]],
            ['key'=>'legendary','name'=>'Legendary','description'=>'Win 200 games','icon'=>'zap','rarity'=>'legendary','xp_reward'=>2000,'criteria'=>['type'=>'games_won','value'=>200]],
        ];
        foreach($achievements as $a) Achievement::firstOrCreate(['key'=>$a['key']],array_merge($a,['is_active'=>true]));

        // Demo public room
        $host = User::where('username','player1')->first();
        if($host) {
            $room = Room::firstOrCreate(['code'=>'DEMO01'],['name'=>'Demo Room','owner_id'=>$host->id,'type'=>'public','max_players'=>6,'invite_token'=>Str::random(64),'last_activity_at'=>now()]);
            RoomPlayer::firstOrCreate(['room_id'=>$room->id,'user_id'=>$host->id],['role'=>'owner','is_ready'=>true,'seat'=>0]);
        }

        $this->command->info('Database seeded successfully!');
    }
}
