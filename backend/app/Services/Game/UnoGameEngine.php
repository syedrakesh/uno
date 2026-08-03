<?php

namespace App\Services\Game;

use App\Models\{Game, GamePlayer, Move, Room, Round, User};
use App\Events\{GameStateUpdated, GameEnded, PlayerTurnChanged, CardPlayed, PlayerUnoAvailable, PlayerDeclaredUno, PlayerUnoCaught, PlayerDrawPenalty};
use Illuminate\Support\Facades\{Cache, DB, Log};
use Carbon\Carbon;

/**
 * UnoGameEngine — implements all official UNO rules + house rules.
 * All game state is persisted in the `rounds` table (draw_pile, discard_pile, hands).
 * Redis cache is used for fast real-time reads.
 */
class UnoGameEngine
{
    private const INITIAL_HAND_SIZE   = 7;
    private const CACHE_TTL_SECONDS   = 3600;
    private const UNO_CALL_WINDOW_MS  = 2000; // 2 sec window to call UNO

    // ─── Public API ───────────────────────────────────────

    /** Start a new round within a game. */
    public function startRound(Game $game, int $roundNumber): Round
    {
        return DB::transaction(function () use ($game, $roundNumber) {
            $settings = $game->settings_snapshot ?? [];
            $players  = $game->players()->where('status', 'active')->orderBy('seat')->get();

            if ($players->count() < 2) {
                throw new \RuntimeException('Need at least 2 active players to start a round.');
            }

            // Build & shuffle deck
            $deck = UnoDeck::shuffle(UnoDeck::build());

            // Deal 7 cards to each player
            $hands = [];
            foreach ($players as $player) {
                [$hand, $deck] = UnoDeck::deal($deck, self::INITIAL_HAND_SIZE);
                $hands[$player->user_id] = $hand;
            }

            // Flip first card — re-draw if it's a Wild Draw Four
            do {
                [$topCard, $deck] = UnoDeck::deal($deck, 1);
                $topCard = $topCard[0];
                $card    = UnoCard::fromId($topCard);
                if ($card->isWildDrawFour()) {
                    $deck[] = $topCard; // put back, reshuffle
                    $deck   = UnoDeck::shuffle($deck);
                }
            } while ($card->isWildDrawFour());

            $discardPile  = [$topCard];
            $currentColor = $card->color === 'wild' ? 'red' : $card->color;

            // Determine first player
            $playerOrder   = $game->player_order ?? $players->pluck('user_id')->toArray();
            $firstPlayerId = $playerOrder[0];

            // Handle action cards on first flip
            $direction = 'clockwise';
            if ($card->isReverse() && count($playerOrder) === 2) {
                // In 2-player, reverse acts as skip
                $firstPlayerId = $playerOrder[1] ?? $playerOrder[0];
            } elseif ($card->isReverse()) {
                $direction     = 'counterclockwise';
                $firstPlayerId = $playerOrder[0];
            } elseif ($card->isSkip()) {
                $firstPlayerId = $playerOrder[1] ?? $playerOrder[0];
            } elseif ($card->isDrawTwo()) {
                $firstPlayerId = $playerOrder[1] ?? $playerOrder[0];
                // Give top player 2 cards
                $drawTarget = $playerOrder[0];
                [$drawn, $deck] = UnoDeck::deal($deck, 2);
                $hands[$drawTarget] = array_merge($hands[$drawTarget] ?? [], $drawn);
            }

            $round = Round::create([
                'game_id'           => $game->id,
                'round_number'      => $roundNumber,
                'status'            => 'active',
                'current_player_id' => $firstPlayerId,
                'direction'         => $direction,
                'draw_pile'         => $deck,
                'discard_pile'      => $discardPile,
                'hands'             => $hands,
                'top_card'          => $topCard,
                'current_color'     => $currentColor,
                'pending_draw'      => 0,
                'turn_started_at'   => now(),
            ]);

            // Update game player hand sizes
            foreach ($players as $player) {
                $player->update(['cards_in_hand' => count($hands[$player->user_id] ?? [])]);
            }

            $this->cacheGameState($round);

            return $round;
        });
    }

    /** Play a card from a player's hand. Returns updated round state. */
    public function playCard(Round $round, int $userId, string $cardId, ?string $chosenColor = null): array
    {
        return DB::transaction(function () use ($round, $userId, $cardId, $chosenColor) {
            $this->assertPlayerTurn($round, $userId);
            $this->assertCardInHand($round, $userId, $cardId);

            // Clear any UNO vulnerability from the previous player since a new turn is starting
            $vulnerable = Cache::get("uno_vulnerable:{$round->id}");
            if ($vulnerable !== null && $vulnerable !== $userId) {
                Cache::forget("uno_vulnerable:{$round->id}");
            }

            $game     = $round->game;
            $settings = $game->settings_snapshot ?? [];
            $card     = UnoCard::fromId($cardId);

            // Validate the card can be played
            if (!$card->canPlayOn(
                $round->top_card,
                $round->current_color,
                $settings['stacking'] ?? false,
                $round->pending_draw
            )) {
                throw new \RuntimeException('Card cannot be played on current top card.');
            }

            // Wild card must specify a color
            if ($card->isWild() && !$chosenColor) {
                throw new \RuntimeException('Must choose a color when playing a wild card.');
            }
            if ($chosenColor && !in_array($chosenColor, UnoCard::COLORS)) {
                throw new \RuntimeException('Invalid color choice.');
            }

            $hands       = $round->hands;
            $discardPile = $round->discard_pile;
            $drawPile    = $round->draw_pile;

            // Remove card from hand
            $hand      = $hands[$userId];
            $cardIndex = array_search($cardId, $hand);
            array_splice($hand, $cardIndex, 1);
            $hands[$userId] = array_values($hand);

            // Add to discard
            array_push($discardPile, $cardId);

            $newColor     = $chosenColor ?? $card->color;
            $pendingDraw  = $round->pending_draw;
            $direction    = $round->direction;
            $playerOrder  = $game->player_order;
            $currentIndex = array_search($userId, $playerOrder);

            // Handle action cards
            $nextUserId = $this->getNextPlayer($playerOrder, $currentIndex, $direction);

            if ($card->isSkip()) {
                // Skip next player — advance twice
                $nextUserId = $this->getNextPlayer($playerOrder, array_search($nextUserId, $playerOrder), $direction);
            } elseif ($card->isReverse()) {
                $direction  = $direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
                $nextUserId = count($playerOrder) === 2
                    ? $userId // 2-player reverse = skip, same player goes again
                    : $this->getNextPlayer($playerOrder, $currentIndex, $direction);
            } elseif ($card->isDrawTwo()) {
                if ($settings['stacking'] ?? false) {
                    $pendingDraw += 2;
                } else {
                    // Force next player to draw 2 and skip
                    [$drawn, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, 2);
                    $hands[$nextUserId] = array_merge($hands[$nextUserId] ?? [], $drawn);
                    // skip next player
                    $nextUserId = $this->getNextPlayer($playerOrder, array_search($nextUserId, $playerOrder), $direction);
                }
            } elseif ($card->isWildDrawFour()) {
                if ($settings['stacking'] ?? false) {
                    $pendingDraw += 4;
                } else {
                    // force next player to draw 4 and skip (challenge possible — handled separately)
                    [$drawn, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, 4);
                    $hands[$nextUserId] = array_merge($hands[$nextUserId] ?? [], $drawn);
                    $nextUserId = $this->getNextPlayer($playerOrder, array_search($nextUserId, $playerOrder), $direction);
                }
            } elseif ($pendingDraw > 0 && ($settings['stacking'] ?? false)) {
                // Player is not stacking — they must draw
                [$drawn, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, $pendingDraw);
                $hands[$userId] = array_merge($hands[$userId], $drawn);
                $pendingDraw    = 0;
            }

            // 7-0 rule
            if ($settings['seven_zero_rule'] ?? false) {
                if ($card->value === '7') {
                    // Swap hands with chosen player (nextUserId)
                    [$hands[$userId], $hands[$nextUserId]] = [$hands[$nextUserId], $hands[$userId]];
                } elseif ($card->value === '0') {
                    // Rotate all hands in play direction
                    $rotated = $this->rotateHands($hands, $playerOrder, $direction);
                    $hands   = $rotated;
                }
            }

            // Record move
            $move = Move::create([
                'round_id'   => $round->id,
                'game_id'    => $round->game_id,
                'user_id'    => $userId,
                'move_number'=> $round->moves()->count() + 1,
                'action'     => 'play_card',
                'card_played'=> $cardId,
                'chosen_color'=> $chosenColor,
                'played_at'  => now(),
                'time_taken_ms' => $round->turn_started_at
                    ? (int) $round->turn_started_at->diffInMilliseconds(now())
                    : null,
            ]);

            // Update game.total_moves
            $round->game->increment('total_moves');

            // Check win condition: hand empty
            $roundEnded = empty($hands[$userId]);

            $round->update([
                'draw_pile'         => $drawPile,
                'discard_pile'      => $discardPile,
                'hands'             => $hands,
                'top_card'          => $cardId,
                'current_color'     => $newColor,
                'direction'         => $direction,
                'pending_draw'      => $pendingDraw,
                'current_player_id' => $roundEnded ? null : $nextUserId,
                'status'            => $roundEnded ? 'finished' : 'active',
                'winner_id'         => $roundEnded ? $userId : null,
                'turn_started_at'   => $roundEnded ? null : now(),
            ]);

            // UNO state check
            if (count($hands[$userId]) === 1) {
                GamePlayer::where('game_id', $round->game_id)->where('user_id', $userId)->update(['called_uno' => false]);
                Cache::put("uno_vulnerable:{$round->id}", $userId, 3600);
                Cache::forget("uno_called:{$round->id}:{$userId}");
                broadcast(new PlayerUnoAvailable($round, $userId))->toOthers();
            }

            // Sync hand counts
            foreach ($hands as $uid => $hand) {
                GamePlayer::where('game_id', $round->game_id)
                    ->where('user_id', $uid)
                    ->update(['cards_in_hand' => count($hand)]);
            }

            $round->refresh();
            $this->cacheGameState($round);

            // Broadcast
            broadcast(new CardPlayed($round, $userId, $cardId, $chosenColor))->toOthers();
            broadcast(new GameStateUpdated($round))->toOthers();

            if ($roundEnded) {
                $this->endRound($round, $userId);
            } else {
                broadcast(new PlayerTurnChanged($round, $nextUserId))->toOthers();
            }

            return $this->getPublicState($round, $userId);
        });
    }

    /** Draw a card from the deck. */
    public function drawCard(Round $round, int $userId): array
    {
        return DB::transaction(function () use ($round, $userId) {
            $this->assertPlayerTurn($round, $userId);

            // Clear any UNO vulnerability from the previous player since a new turn is starting
            $vulnerable = Cache::get("uno_vulnerable:{$round->id}");
            if ($vulnerable !== null && $vulnerable !== $userId) {
                Cache::forget("uno_vulnerable:{$round->id}");
            }

            $settings    = $round->game->settings_snapshot ?? [];
            $hands       = $round->hands;
            $drawPile    = $round->draw_pile;
            $discardPile = $round->discard_pile;
            $pendingDraw = $round->pending_draw;
            $playerOrder = $round->game->player_order;
            $direction   = $round->direction;
            $currentIndex= array_search($userId, $playerOrder);

            $drawCount = $pendingDraw > 0 ? $pendingDraw : 1;
            [$drawn, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, $drawCount);
            $hands[$userId] = array_merge($hands[$userId] ?? [], $drawn);

            $pendingDraw = 0;
            $nextUserId  = $this->getNextPlayer($playerOrder, $currentIndex, $direction);

            // draw_until_can_play: keep drawing if nothing playable
            if (($settings['draw_until_can_play'] ?? false) && $drawCount === 1) {
                while (!$this->hasPlayableCard($hands[$userId], $round->top_card, $round->current_color, $settings)) {
                    if (empty($drawPile) && count($discardPile) <= 1) break;
                    [$extra, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, 1);
                    $hands[$userId] = array_merge($hands[$userId], $extra);
                }
            }

            Move::create([
                'round_id'    => $round->id,
                'game_id'     => $round->game_id,
                'user_id'     => $userId,
                'move_number' => $round->moves()->count() + 1,
                'action'      => $pendingDraw > 0 ? 'draw_penalty' : 'draw_card',
                'cards_drawn' => $drawn,
                'played_at'   => now(),
            ]);

            $round->update([
                'draw_pile'         => $drawPile,
                'discard_pile'      => $discardPile,
                'hands'             => $hands,
                'pending_draw'      => 0,
                'current_player_id' => $nextUserId,
                'turn_started_at'   => now(),
            ]);

            // Clear UNO state if player draws above 1
            if (count($hands[$userId]) > 1) {
                GamePlayer::where('game_id', $round->game_id)->where('user_id', $userId)->update(['called_uno' => false]);
                if (Cache::get("uno_vulnerable:{$round->id}") === $userId) {
                    Cache::forget("uno_vulnerable:{$round->id}");
                }
                Cache::forget("uno_called:{$round->id}:{$userId}");
            }

            GamePlayer::where('game_id', $round->game_id)
                ->where('user_id', $userId)
                ->update(['cards_in_hand' => count($hands[$userId])]);

            $round->refresh();
            $this->cacheGameState($round);
            broadcast(new GameStateUpdated($round))->toOthers();
            broadcast(new PlayerTurnChanged($round, $nextUserId))->toOthers();

            return $this->getPublicState($round, $userId);
        });
    }

    /** Player calls UNO when they have 1 card left. */
    public function callUno(Round $round, int $userId): bool
    {
        $hands = $round->hands;
        if (count($hands[$userId] ?? []) !== 1) {
            return false;
        }
        GamePlayer::where('game_id', $round->game_id)
            ->where('user_id', $userId)
            ->update(['called_uno' => true]);
        Cache::put("uno_called:{$round->id}:{$userId}", true, 3600);
        
        if (Cache::get("uno_vulnerable:{$round->id}") === $userId) {
            Cache::forget("uno_vulnerable:{$round->id}");
        }
        
        broadcast(new PlayerDeclaredUno($round, $userId))->toOthers();
        
        return true;
    }

    /** Challenge a player who forgot to call UNO. */
    public function challengeUno(Round $round, int $challengerId, int $targetId): array
    {
        return DB::transaction(function () use ($round, $challengerId, $targetId) {
            if ($round->status !== 'active') {
                return ['success' => false, 'state' => $this->getPublicState($round, $challengerId)];
            }

            $hands       = $round->hands;
            $targetHand  = $hands[$targetId] ?? [];
            $calledUno   = Cache::get("uno_called:{$round->id}:{$targetId}", false);
            $vulnerable  = Cache::get("uno_vulnerable:{$round->id}");

            $isWindowOpen = ($vulnerable === $targetId);
            $success = count($targetHand) === 1 && !$calledUno && $isWindowOpen;

            if ($success) {
                // Target must draw 2 as penalty
                [$drawn, $drawPile, $discardPile] = $this->drawCards($round->draw_pile, $round->discard_pile, 2);
                $hands[$targetId] = array_merge($targetHand, $drawn);
                $round->update(['draw_pile' => $drawPile, 'discard_pile' => $discardPile, 'hands' => $hands]);
                GamePlayer::where('game_id', $round->game_id)->where('user_id', $targetId)
                    ->update(['cards_in_hand' => count($hands[$targetId]), 'called_uno' => false]);
                
                Cache::forget("uno_vulnerable:{$round->id}");
                
                broadcast(new PlayerUnoCaught($round, $targetId, $challengerId))->toOthers();
                broadcast(new PlayerDrawPenalty($round, $targetId, 2))->toOthers();
            }

            Move::create([
                'round_id'             => $round->id,
                'game_id'              => $round->game_id,
                'user_id'              => $challengerId,
                'move_number'          => $round->moves()->count() + 1,
                'action'               => 'challenge_uno',
                'was_challenged'       => true,
                'challenge_successful' => $success,
                'played_at'            => now(),
            ]);

            $round->refresh();
            $this->cacheGameState($round);
            broadcast(new GameStateUpdated($round))->toOthers();

            return ['success' => $success, 'state' => $this->getPublicState($round, $challengerId)];
        });
    }

    /** Challenge a Wild Draw Four (player claims previous player had another playable card). */
    public function challengeWildDrawFour(Round $round, int $challengerId, int $targetId): array
    {
        return DB::transaction(function () use ($round, $challengerId, $targetId) {
            // Get the hand BEFORE the WD4 was played (from last move state)
            $lastMove  = $round->moves()->where('user_id', $targetId)->latest()->first();
            $hands     = $round->hands;
            $drawPile  = $round->draw_pile;
            $discardPile = $round->discard_pile;

            // We need the previous hand — stored before play. For simplicity, re-check current hand.
            // Check if target HAD a playable card before the WD4 (look at color before WD4 was played)
            $previousColor = null;
            $discardCopy   = $discardPile;
            array_pop($discardCopy); // remove the WD4
            $previousTop   = end($discardCopy) ?: 'red_0';
            $previousColor = UnoCard::fromId($previousTop)->color;

            // Simplified: challenger succeeds if target's current hand has a same-color card
            $targetHand   = $hands[$targetId] ?? [];
            $hadPlayable  = false;
            foreach ($targetHand as $cardId) {
                $c = UnoCard::fromId($cardId);
                if (!$c->isWild() && $c->color === $previousColor) {
                    $hadPlayable = true;
                    break;
                }
            }

            if ($hadPlayable) {
                // Challenge succeeds: target draws 4 instead of challenger
                [$drawn, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, 4);
                $hands[$targetId] = array_merge($targetHand, $drawn);
            } else {
                // Challenge fails: challenger draws 6 (4 + 2 penalty)
                [$drawn, $drawPile, $discardPile] = $this->drawCards($drawPile, $discardPile, 6);
                $hands[$challengerId] = array_merge($hands[$challengerId] ?? [], $drawn);
            }

            $round->update(['draw_pile' => $drawPile, 'discard_pile' => $discardPile, 'hands' => $hands]);
            foreach ([$targetId, $challengerId] as $uid) {
                GamePlayer::where('game_id', $round->game_id)->where('user_id', $uid)
                    ->update(['cards_in_hand' => count($hands[$uid] ?? [])]);
            }

            Move::create([
                'round_id'             => $round->id,
                'game_id'              => $round->game_id,
                'user_id'              => $challengerId,
                'move_number'          => $round->moves()->count() + 1,
                'action'               => 'challenge_wild4',
                'was_challenged'       => true,
                'challenge_successful' => $hadPlayable,
                'played_at'            => now(),
            ]);

            $round->refresh();
            $this->cacheGameState($round);
            broadcast(new GameStateUpdated($round))->toOthers();

            return ['success' => $hadPlayable, 'state' => $this->getPublicState($round, $challengerId)];
        });
    }

    /** Handle turn timeout — auto-draw and pass. */
    public function handleTimeout(Round $round): void
    {
        $userId = $round->current_player_id;
        if (!$userId) return;

        try {
            $this->drawCard($round, $userId);
            Move::where('game_id', $round->game_id)
                ->where('user_id', $userId)
                ->latest()
                ->first()
                ?->update(['action' => 'timeout']);
        } catch (\Throwable $e) {
            Log::error('Timeout handling failed', ['round' => $round->id, 'error' => $e->getMessage()]);
        }
    }

    /** Get state visible to a specific player (hide other players' hands). */
    public function getPublicState(Round $round, int $viewingUserId): array
    {
        $hands = $round->hands ?? [];
        $publicHands = [];
        $unoStatus = [];
        
        foreach ($hands as $uid => $hand) {
            $publicHands[$uid] = (int)$uid === $viewingUserId
                ? array_map(fn($id) => UnoCard::fromId($id)->toArray(), $hand)
                : count($hand); // only count for others
            
            $calledUno = Cache::get("uno_called:{$round->id}:{$uid}", false);
            $vulnerable = Cache::get("uno_vulnerable:{$round->id}");
            $isChallengeable = count($hand) === 1 && !$calledUno && ($vulnerable === $uid);
            
            $unoStatus[$uid] = [
                'called_uno' => $calledUno,
                'is_challengeable' => $isChallengeable,
            ];
        }

        return [
            'round_id'          => $round->id,
            'game_id'           => $round->game_id,
            'round_number'      => $round->round_number,
            'status'            => $round->status,
            'winner_id'         => $round->winner_id,
            'top_card'          => $round->top_card ? UnoCard::fromId($round->top_card)->toArray() : null,
            'current_color'     => $round->current_color,
            'direction'         => $round->direction,
            'current_player_id' => $round->current_player_id,
            'pending_draw'      => $round->pending_draw,
            'draw_pile_count'   => count($round->draw_pile ?? []),
            'hands'             => $publicHands,
            'uno_status'        => $unoStatus,
            'my_hand'           => array_map(fn($id) => UnoCard::fromId($id)->toArray(), $hands[$viewingUserId] ?? []),
            'turn_started_at'   => $round->turn_started_at?->toISOString(),
        ];
    }

    // ─── Private Helpers ──────────────────────────────────

    private function assertPlayerTurn(Round $round, int $userId): void
    {
        if ((int)$round->current_player_id !== $userId) {
            throw new \RuntimeException('It is not your turn.');
        }
        if ($round->status !== 'active') {
            throw new \RuntimeException('Round is not active.');
        }
    }

    private function assertCardInHand(Round $round, int $userId, string $cardId): void
    {
        $hand = $round->hands[$userId] ?? [];
        if (!in_array($cardId, $hand)) {
            throw new \RuntimeException('Card not in your hand.');
        }
    }

    private function getNextPlayer(array $playerOrder, int $currentIndex, string $direction): int
    {
        $count = count($playerOrder);
        if ($direction === 'clockwise') {
            $nextIndex = ($currentIndex + 1) % $count;
        } else {
            $nextIndex = ($currentIndex - 1 + $count) % $count;
        }
        return $playerOrder[$nextIndex];
    }

    private function drawCards(array $drawPile, array $discardPile, int $count): array
    {
        if (count($drawPile) < $count) {
            [$drawPile, $discardPile] = UnoDeck::reshuffleDiscard($drawPile, $discardPile);
        }
        [$drawn, $drawPile] = UnoDeck::deal($drawPile, min($count, count($drawPile)));
        return [$drawn, $drawPile, $discardPile];
    }

    private function hasPlayableCard(array $hand, string $topCard, string $currentColor, array $settings): bool
    {
        foreach ($hand as $cardId) {
            $card = UnoCard::fromId($cardId);
            if ($card->canPlayOn($topCard, $currentColor, $settings['stacking'] ?? false)) {
                return true;
            }
        }
        return false;
    }

    private function rotateHands(array $hands, array $playerOrder, string $direction): array
    {
        $ordered = array_map(fn($uid) => $hands[$uid] ?? [], $playerOrder);
        if ($direction === 'clockwise') {
            $first   = array_shift($ordered);
            $ordered[] = $first;
        } else {
            $last    = array_pop($ordered);
            array_unshift($ordered, $last);
        }
        $result = [];
        foreach ($playerOrder as $i => $uid) {
            $result[$uid] = $ordered[$i];
        }
        return $result;
    }

    private function endRound(Round $round, int $winnerId): void
    {
        $game  = $round->game;
        $hands = $round->hands ?? [];

        // Calculate score: sum of all other players' hand values
        $score = 0;
        foreach ($hands as $uid => $hand) {
            if ((int)$uid !== $winnerId) {
                $score += UnoDeck::handPoints($hand);
            }
        }

        GamePlayer::where('game_id', $game->id)->where('user_id', $winnerId)
            ->increment('score', $score);

        // Refresh winner player record after increment
        $winnerPlayer = GamePlayer::where('game_id', $game->id)->where('user_id', $winnerId)->first();
        $settings     = $game->settings_snapshot ?? [];
        $pointsToWin  = $settings['points_to_win'] ?? 500;
        $roundsToWin  = $settings['rounds_to_win'] ?? 1;

        // Count how many rounds this winner has won
        $roundsWon = Round::where('game_id', $game->id)
            ->where('winner_id', $winnerId)
            ->where('status', 'finished')
            ->count();

        // End game if: enough rounds won OR points threshold reached
        $gameOver = ($roundsWon >= $roundsToWin) || ($winnerPlayer && $winnerPlayer->score >= $pointsToWin);

        if ($gameOver) {
            $this->endGame($game, $winnerId);
        } else {
            broadcast(new GameStateUpdated($round))->toOthers();
        }
    }

    private function endGame(Game $game, int $winnerId): void
    {
        $game->update([
            'status'      => 'finished',
            'winner_id'   => $winnerId,
            'finished_at' => now(),
            'duration_seconds' => $game->started_at
                ? (int) $game->started_at->diffInSeconds(now())
                : null,
        ]);

        // Update room status
        $game->room->update(['status' => 'finished', 'last_activity_at' => now()]);

        // Award XP, update stats
        $this->awardXpAndStats($game, $winnerId);

        broadcast(new GameEnded($game->fresh(), $winnerId));
    }

    private function awardXpAndStats(Game $game, int $winnerId): void
    {
        $players = $game->players;
        foreach ($players as $player) {
            $user = User::find($player->user_id);
            if (!$user || $user->is_guest) continue;

            $isWinner = (int)$player->user_id === $winnerId;
            $xp = $isWinner ? 100 : 20;
            $user->addXp($xp);
            $player->update(['xp_earned' => $xp, 'finish_position' => $isWinner ? 1 : 2]);

            $user->stats()->updateOrCreate(['user_id' => $user->id], []);
            $user->stats()->increment('games_played');
            if ($isWinner) $user->stats()->increment('games_won');
            else           $user->stats()->increment('games_lost');
        }
    }

    private function cacheGameState(Round $round): void
    {
        Cache::put(
            "game_state:round:{$round->id}",
            $round->toArray(),
            self::CACHE_TTL_SECONDS
        );
    }
}
