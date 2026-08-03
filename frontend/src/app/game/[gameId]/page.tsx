'use client';
import { useParams } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { reset } = useGameStore();
  useEffect(() => { return () => { reset(); }; }, []);
  return <GameBoard gameId={parseInt(gameId)} />;
}
