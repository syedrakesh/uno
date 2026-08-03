<?php
use App\Services\Game\{UnoDeck,UnoCard};

test('deck has 108 cards', function () {
    $deck = UnoDeck::build();
    expect($deck)->toHaveCount(108);
});

test('deck contains correct wild cards', function () {
    $deck = UnoDeck::build();
    $wilds = array_filter($deck, fn($c) => $c === 'wild_wild');
    $wdf   = array_filter($deck, fn($c) => $c === 'wild_wild_draw_four');
    expect(count($wilds))->toBe(4);
    expect(count($wdf))->toBe(4);
});

test('shuffle changes order', function () {
    $deck      = UnoDeck::build();
    $shuffled  = UnoDeck::shuffle($deck);
    expect($shuffled)->not->toBe($deck);
    expect(sort($shuffled))->toBe(sort($deck));
});

test('deal removes cards from top', function () {
    $deck = UnoDeck::build();
    [$dealt, $remaining] = UnoDeck::deal($deck, 7);
    expect($dealt)->toHaveCount(7);
    expect($remaining)->toHaveCount(101);
});

test('hand points calculated correctly', function () {
    $hand = ['red_7', 'blue_skip', 'wild_wild'];
    expect(UnoDeck::handPoints($hand))->toBe(7 + 20 + 50);
});

test('card can play on matching color', function () {
    $card = UnoCard::make('red', '5');
    expect($card->canPlayOn('red_3', 'red'))->toBeTrue();
});

test('card can play on matching value', function () {
    $card = UnoCard::make('blue', '5');
    expect($card->canPlayOn('red_5', 'red'))->toBeTrue();
});

test('wild can always be played', function () {
    $wild = UnoCard::make('wild', 'wild');
    expect($wild->canPlayOn('red_7', 'red'))->toBeTrue();
    expect($wild->canPlayOn('blue_skip', 'blue'))->toBeTrue();
});

test('card cannot play on different color and value', function () {
    $card = UnoCard::make('blue', '3');
    expect($card->canPlayOn('red_7', 'red'))->toBeFalse();
});

test('stacking only allows draw cards on draw cards', function () {
    $drawTwo = UnoCard::make('red','draw_two');
    $normal  = UnoCard::make('red','5');
    expect($drawTwo->canPlayOn('blue_draw_two','blue',true,2))->toBeTrue();
    expect($normal->canPlayOn('blue_draw_two','blue',true,2))->toBeFalse();
});
