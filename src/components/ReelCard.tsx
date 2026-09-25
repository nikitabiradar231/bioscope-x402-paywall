'use client';

import React from 'react';
import { Reel } from '@/lib/reels';

interface ReelCardProps {
  reel: Reel;
  isPurchased: boolean;
  onSelectReel: (reel: Reel, mode: 'preview' | 'full') => void;
}

export default function ReelCard({ reel, isPurchased, onSelectReel }: ReelCardProps) {
  return (
    <div className="relative group bg-gradient-to-b from-amber-950/90 via-stone-900 to-amber-950/90 border-2 border-amber-800/80 rounded-2xl overflow-hidden shadow-2xl hover:shadow-amber-900/40 transition-all duration-300 flex flex-col hover:-translate-y-1">
      {/* Brass rivet decorations in 4 corners */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-600 to-yellow-800 border border-yellow-200/50 shadow-inner z-10" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-600 to-yellow-800 border border-yellow-200/50 shadow-inner z-10" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-600 to-yellow-800 border border-yellow-200/50 shadow-inner z-10" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-600 to-yellow-800 border border-yellow-200/50 shadow-inner z-10" />

      {/* Reel Header / Film Canister Tag */}
      <div className="bg-amber-900/40 border-b border-amber-800/60 px-5 py-3.5 flex items-center justify-between">
        <span className="text-amber-400 font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          REEL #{reel.id.replace('reel-', '')} • {reel.year}
        </span>
        {isPurchased ? (
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-600/70 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
            ✓ UNLOCKED
          </span>
        ) : (
          <span className="bg-amber-900/70 text-amber-200 border border-amber-600/50 text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1">
            🪙 {reel.priceUsdc} USDC
          </span>
        )}
      </div>

      {/* Reel Preview Frame Viewport */}
      <div className="relative aspect-video bg-black overflow-hidden group-hover:brightness-105 transition-all">
        {/* Film sprockets border simulation */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-stone-900 border-r border-amber-900/60 flex flex-col justify-between py-2 z-10 opacity-75">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-2.5 h-2 bg-black rounded-sm mx-auto border border-stone-700" />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-stone-900 border-l border-amber-900/60 flex flex-col justify-between py-2 z-10 opacity-75">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-2.5 h-2 bg-black rounded-sm mx-auto border border-stone-700" />
          ))}
        </div>

        {/* Free Preview Image (Frame 1) */}
        {/* eslint-disable-next-html-link */}
        <img
          src={reel.thumbnailUrl}
          alt={reel.title}
          className="w-full h-full object-cover sepia contrast-110 brightness-90 group-hover:scale-105 transition-transform duration-500"
        />

        {/* Vintage Ocular Overlay Gradient */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/80 pointer-events-none" />

        {/* Free Frame Tag */}
        <div className="absolute bottom-3 left-6 bg-black/80 backdrop-blur text-amber-300 text-[11px] font-mono px-2.5 py-1 rounded border border-amber-700/50">
          FRAME 01 / 08 (FREE PREVIEW)
        </div>
      </div>

      {/* Reel Description & Details */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-amber-100 group-hover:text-amber-300 transition-colors">
            {reel.title}
          </h3>
          <p className="text-amber-400/80 text-xs font-medium mt-1 flex items-center gap-1">
            📍 {reel.location}
          </p>
          <p className="text-stone-300 text-sm leading-relaxed mt-2.5 line-clamp-3">
            {reel.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-amber-900/50">
          <button
            onClick={() => onSelectReel(reel, 'preview')}
            className="w-full bg-stone-800 hover:bg-stone-700 text-amber-200 font-semibold text-xs py-2.5 px-3 rounded-lg border border-stone-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>👁️</span> Watch Preview
          </button>
          <button
            onClick={() => onSelectReel(reel, 'full')}
            className={`w-full font-bold text-xs py-2.5 px-3 rounded-lg border shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isPurchased
                ? 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-emerald-100 border-emerald-500/60 shadow-emerald-950/40'
                : 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-stone-950 border-yellow-400 shadow-amber-950/60'
            }`}
          >
            {isPurchased ? (
              <>
                <span>🎬</span> Watch Reel
              </>
            ) : (
              <>
                <span>🪙</span> Unlock Reel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
