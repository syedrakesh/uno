'use client';

import React, { useState, useEffect } from 'react';
import { soundManager } from '@/lib/sound';

export function SoundControl() {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    setMuted(soundManager.isMuted());
    setVolume(soundManager.getVolume());
  }, []);

  const handleToggleMute = () => {
    const isNowMuted = soundManager.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      soundManager.playCard(); // quick sound preview on unmute
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundManager.setVolume(val);
    if (muted && val > 0) {
      soundManager.setMuted(false);
      setMuted(false);
    }
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        onClick={handleToggleMute}
        title={muted ? 'Unmute Sound' : 'Mute Sound'}
        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center w-10 h-10"
      >
        <span className="text-lg leading-none">{muted ? '🔇' : volume === 0 ? '🔈' : volume < 0.5 ? '🔉' : '🔊'}</span>
      </button>

      {/* Volume slider dropdown/popover */}
      {showSlider && (
        <div className="absolute right-0 top-12 bg-gray-900/90 border border-white/20 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-150 min-w-[140px]">
          <div className="flex items-center justify-between w-full text-xs font-semibold text-white/70">
            <span>Volume</span>
            <span>{muted ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
          />
        </div>
      )}
    </div>
  );
}
