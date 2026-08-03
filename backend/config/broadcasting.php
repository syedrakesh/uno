<?php
return [
    'default' => env('BROADCAST_CONNECTION','pusher'),
    'connections' => [
        'pusher' => [
            'driver'  => 'pusher',
            'key'     => env('PUSHER_APP_KEY'),
            'secret'  => env('PUSHER_APP_SECRET'),
            'app_id'  => env('PUSHER_APP_ID'),
            'options' => [
                'host'      => env('PUSHER_HOST','localhost'),
                'port'      => env('PUSHER_PORT',6001),
                'scheme'    => env('PUSHER_SCHEME','http'),
                'encrypted' => true,
                'useTLS'    => env('PUSHER_SCHEME')==='https',
                'cluster'   => env('PUSHER_APP_CLUSTER','mt1'),
            ],
            'client_options' => [],
        ],
        'redis' => ['driver'=>'redis','connection'=>'default','queue'=>'{default}','retry_after'=>90,'block_for'=>null],
        'log'   => ['driver'=>'log'],
        'null'  => ['driver'=>'null'],
    ],
];
