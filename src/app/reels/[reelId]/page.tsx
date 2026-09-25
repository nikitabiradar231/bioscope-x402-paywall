'use client';

import React, { useState, useEffect, use } from 'react';
import { Reel } from '@/lib/reels';
import BioscopePlayer from '@/components/BioscopePlayer';
import WalletButton from '@/components/WalletButton';
import Link from 'next/link';

export default function ReelDetailPage({
  params
}: {
  params: Promise<{ reelId: string }>;
}) {
  const { reelId } = use(params);
  const [reel, setReel] = useState<Reel | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean>(false);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPlayer, setShowPlayer] = useState<boolean>(false);

  useEffect(() => {
    fetchReel();
  }, [reelId]);

  useEffect(() => {
    if (activeWallet && reelId) {
      checkPurchaseStatus(activeWallet, reelId);
    } else {
      setIsPurchased(false);
    }
  }, [activeWallet, reelId]);

  const fetchReel = async () => {
    try {
      const res = await fetch('/api/reels');
      const data = await res.json();
      const found = (data.reels || []).find((r: Reel) => r.id === reelId);
      setReel(found || null);
    } catch (err) {
      console.error('Failed to fetch reel:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async (wallet: string, rId: string) => {
    try {
      const res = await fetch(`/api/purchases?walletAddress=${wallet}`);
      if (res.ok) {
        const data = await res.json();
        const purchasedIds: string[] = data.purchasedReelIds || [];
        setIsPurchased(purchasedIds.includes(rId));
      }
    } catch (err) {
      console.error('Failed to check purchase status:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-amber-300 font-mono flex items-center justify-center">
        Loading reel details...
      </div>
    );
  }

  if (!reel) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 gap-4">
        <h1 className="text-3xl font-serif text-amber-200">Reel Not Found</h1>
        <p className="text-amber-400/80 text-sm">The requested bioscope reel ID does not exist.</p>
        <Link href="/" className="px-4 py-2 bg-amber-800 text-amber-100 rounded hover:bg-amber-700">
          ← Back to Bioscope Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <header className="bg-amber-950/80 border-b border-amber-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-amber-300 hover:text-amber-100 text-sm font-mono flex items-center gap-2">
          ← Gallery
        </Link>
        <WalletButton onAuthChange={(w) => setActiveWallet(w)} />
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        <div className="bg-gradient-to-b from-amber-950/80 to-stone-900 border-2 border-amber-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-mono text-xs font-bold uppercase">
              REEL {reel.id} • {reel.year}
            </span>
            {isPurchased ? (
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 text-xs font-bold px-3 py-1 rounded-full">
                ✓ UNLOCKED
              </span>
            ) : (
              <span className="bg-amber-900 text-amber-200 border border-amber-600 text-xs font-bold px-3 py-1 rounded-full">
                🪙 {reel.priceUsdc} USDC
              </span>
            )}
          </div>

          <h1 className="text-4xl font-serif font-bold text-amber-100">{reel.title}</h1>
          <p className="text-stone-300 leading-relaxed">{reel.description}</p>

          <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-amber-800 relative">
            {/* eslint-disable-next-html-link */}
            <img
              src={reel.thumbnailUrl}
              alt={reel.title}
              className="w-full h-full object-cover sepia"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button
                onClick={() => setShowPlayer(true)}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-6 py-3 rounded-xl shadow-2xl text-lg flex items-center gap-2 cursor-pointer"
              >
                ▶ Launch Bioscope Player
              </button>
            </div>
          </div>
        </div>
      </main>

      {showPlayer && (
        <BioscopePlayer
          reel={reel}
          isPurchased={isPurchased}
          walletAddress={activeWallet}
          onClose={() => setShowPlayer(false)}
          onUnlockSuccess={() => {
            if (activeWallet) checkPurchaseStatus(activeWallet, reelId);
          }}
        />
      )}
    </div>
  );
}
