<?php

namespace App\Services\Game;

use Illuminate\Support\Collection;

/**
 * UnoDeck — builds and shuffles the standard 108-card UNO deck.
 */
class UnoDeck
{
    /** Build a full standard 108-card deck */
    public static function build(): array
    {
        $cards = [];

        foreach (UnoCard::COLORS as $color) {
            // One 0 per color
            $cards[] = UnoCard::make($color, '0')->id;

            // Two of each 1-9 + skip + reverse + draw_two
            foreach ([...range(1, 9), 'skip', 'reverse', 'draw_two'] as $value) {
                $cards[] = UnoCard::make($color, (string)$value)->id;
                $cards[] = UnoCard::make($color, (string)$value)->id;
            }
        }

        // 4 Wild + 4 Wild Draw Four
        for ($i = 0; $i < 4; $i++) {
            $cards[] = UnoCard::make('wild', 'wild')->id;
            $cards[] = UnoCard::make('wild', 'wild_draw_four')->id;
        }

        return $cards; // 108 cards
    }

    /** Shuffle deck using Fisher-Yates */
    public static function shuffle(array $cards): array
    {
        $deck = $cards;
        for ($i = count($deck) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$deck[$i], $deck[$j]] = [$deck[$j], $deck[$i]];
        }
        return array_values($deck);
    }

    /** Deal $count cards from the top of the deck, returns [dealt, remaining_deck] */
    public static function deal(array $deck, int $count): array
    {
        $dealt     = array_slice($deck, 0, $count);
        $remaining = array_slice($deck, $count);
        return [$dealt, $remaining];
    }

    /**
     * When draw pile is empty, reshuffle discard pile (except top card) into draw pile.
     */
    public static function reshuffleDiscard(array $drawPile, array $discardPile): array
    {
        if (!empty($drawPile)) {
            return [$drawPile, $discardPile];
        }

        $topCard     = array_pop($discardPile);
        $newDrawPile = self::shuffle($discardPile);
        $newDiscard  = $topCard ? [$topCard] : [];

        return [$newDrawPile, $newDiscard];
    }

    /** Calculate total points in a hand */
    public static function handPoints(array $cardIds): int
    {
        return array_sum(array_map(
            fn(string $id) => UnoCard::fromId($id)->pointValue(),
            $cardIds
        ));
    }
}
