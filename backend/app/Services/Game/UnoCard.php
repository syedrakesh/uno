<?php

namespace App\Services\Game;

use Illuminate\Support\Collection;

/**
 * UnoCard — represents a single UNO card.
 *
 * Card identifier format: "{color}_{value}"
 * Colors: red | green | blue | yellow | wild
 * Values: 0-9 | skip | reverse | draw_two | wild | wild_draw_four
 */
class UnoCard
{
    public const COLORS = ['red', 'green', 'blue', 'yellow'];
    public const WILD_COLORS = ['wild'];
    public const NUMBER_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    public const ACTION_VALUES = ['skip', 'reverse', 'draw_two'];
    public const WILD_VALUES = ['wild', 'wild_draw_four'];

    public function __construct(
        public readonly string $color,
        public readonly string $value,
        public readonly string $id,
    ) {}

    public static function fromId(string $id): self
    {
        $base = explode('#', $id)[0];
        [$color, $value] = explode('_', $base, 2);
        return new self($color, $value, $id);
    }

    public static function make(string $color, string $value, string $instanceId = ''): self
    {
        $id = "{$color}_{$value}" . ($instanceId !== '' ? "#{$instanceId}" : "");
        return new self($color, $value, $id);
    }

    public function isWild(): bool
    {
        return $this->color === 'wild';
    }

    public function isDrawTwo(): bool
    {
        return $this->value === 'draw_two';
    }

    public function isWildDrawFour(): bool
    {
        return $this->value === 'wild_draw_four';
    }

    public function isSkip(): bool
    {
        return $this->value === 'skip';
    }

    public function isReverse(): bool
    {
        return $this->value === 'reverse';
    }

    public function isAction(): bool
    {
        return in_array($this->value, self::ACTION_VALUES) || $this->isWild();
    }

    public function pointValue(): int
    {
        if (is_numeric($this->value)) return (int) $this->value;
        if ($this->value === 'wild' || $this->value === 'wild_draw_four') return 50;
        return 20; // skip, reverse, draw_two
    }

    /**
     * Can this card be played on top of the given top card with current color?
     */
    public function canPlayOn(string $topCardId, string $currentColor, bool $stackingEnabled = false, int $pendingDraw = 0): bool
    {
        // If there's a pending draw stack, only draw cards can be played (when stacking enabled)
        if ($pendingDraw > 0 && $stackingEnabled) {
            if ($this->isDrawTwo()) {
                $topCard = self::fromId($topCardId);
                return $topCard->isDrawTwo();
            }
            if ($this->isWildDrawFour()) {
                return true; // W+4 can always stack
            }
            return false;
        }

        if ($this->isWild()) return true; // Wild always playable

        $topCard = self::fromId($topCardId);

        return $this->color === $currentColor
            || $this->value === $topCard->value;
    }

    public function toArray(): array
    {
        return [
            'id'     => $this->id,
            'color'  => $this->color,
            'value'  => $this->value,
            'points' => $this->pointValue(),
        ];
    }
}
