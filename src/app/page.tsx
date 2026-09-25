'use client';

import React, { useState, useEffect } from 'react';
import { Reel } from '@/lib/reels';
import ReelCard from '@/components/ReelCard';
import BioscopePlayer from '@/components/BioscopePlayer';
import WalletButton from '@/components/WalletButton';

export default function HomePage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [purchasedReelIds, setPurchasedReelIds] = useState<string[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch reels catalog on load
  useEffect(() => {
    fetchReels();
  }, []);

  // Fetch purchases when activeWallet changes
  useEffect(() => {
    if (activeWallet) {
      fetchPurchases(activeWallet);
    } else {
      setPurchasedReelIds([]);
    }
  }, [activeWallet]);

  const fetchReels = async () => {
    try {
      const res = await fetch('/api/reels');
      const data = await res.json();
      setReels(data.reels || []);
    } catch (err) {
      console.error('Failed to fetch reels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async (wallet: string) => {
    try {
      const res = await fetch(`/api/purchases?walletAddress=${wallet}`);
      if (res.ok) {
        const data = await res.json();
        setPurchasedReelIds(data.purchasedReelIds || []);
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    }
  };

  const handleSelectReel = (reel: Reel, mode: 'preview' | 'full') => {
    setSelectedReel(reel);
  };

  const handleUnlockSuccess = () => {
    if (activeWallet) {
      fetchPurchases(activeWallet);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-black">
      {/* Vintage Wooden & Gold Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-b-2 border-amber-800/80 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-800 border-2 border-yellow-300 flex items-center justify-center shadow-lg text-2xl">
              🎞️
            </div>
            <div>
              <h1 className="text-2xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-wide">
                THE BIOSCOPE
              </h1>
              <p className="text-amber-400/90 text-xs font-mono font-medium">
                DROP A COIN • WATCH A REEL • NEVER PAY TWICE
              </p>
            </div>
          </div>

          {/* Wallet Authentication Component */}
          <WalletButton onAuthChange={(wallet) => setActiveWallet(wallet)} />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-10">
        <section className="relative bg-gradient-to-b from-amber-950/60 to-stone-900/60 border-2 border-amber-800/60 rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-900/70 border border-amber-600/50 text-amber-200 font-mono text-xs px-3 py-1 rounded-full uppercase tracking-widest">
              <span>🏛️</span> Archival Motion Picture Gallery
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-amber-100 leading-tight">
              Digitised Historical Reels of Old Bengal
            </h2>
            <p className="text-amber-200/80 text-base md:text-lg leading-relaxed">
              Step back into early 20th century silent cinema. Frame 1 of every historical reel is available for free preview. Drop a small x402 testnet coin to unlock all remaining frames and watch sequentially through our digital hand-cranked bioscope.
            </p>
          </div>
        </section>

        {/* Reels Gallery Catalog Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
            <h3 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
              <span>📼</span> Seeded Bioscope Reels
            </h3>
            <span className="text-amber-400/80 text-xs font-mono">
              3 HISTORICAL REELS AVAILABLE
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-amber-400 font-mono animate-pulse">
              Loading digitised reels catalog...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reels.map((reel) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  isPurchased={purchasedReelIds.includes(reel.id)}
                  onSelectReel={handleSelectReel}
                />
              ))}
            </div>
          )}
        </section>

        {/* x402 Architecture & Security Guarantee Banner */}
        <section className="bg-stone-900/80 border border-amber-800/50 rounded-2xl p-6 md:p-8 space-y-4">
          <h4 className="text-lg font-serif font-bold text-amber-200 flex items-center gap-2">
            <span>🛡️</span> Architecture & Entitlement Guarantees
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-amber-200/80">
            <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-800/40 space-y-1.5">
              <span className="font-mono font-bold text-amber-300">1. Private Media Storage</span>
              <p className="text-stone-300">Paid frame files reside strictly in private storage (<code className="text-amber-400">private/reels/</code>). Never exposed via public static paths.</p>
            </div>
            <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-800/40 space-y-1.5">
              <span className="font-mono font-bold text-amber-300">2. Wallet Signature Verified</span>
              <p className="text-stone-300">Wallet identity is proven via SIWX signed challenge verification with nonces tracking to prevent replay attacks.</p>
            </div>
            <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-800/40 space-y-1.5">
              <span className="font-mono font-bold text-amber-300">3. Reel-Scoped Entitlement</span>
              <p className="text-stone-300">Purchases are persisted server-side in SQLite scoped explicitly to <code className="text-amber-400">(wallet_address, reel_id)</code>. Never pay twice for the same reel.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-900/60 bg-stone-950 py-6 text-center text-amber-500/70 text-xs font-mono">
        THE BIOSCOPE • X402 PAYWALL PROTOCOL DEMO • ROAD TO DEVCON VI
      </footer>

      {/* Bioscope Player Modal */}
      {selectedReel && (
        <BioscopePlayer
          reel={selectedReel}
          isPurchased={purchasedReelIds.includes(selectedReel.id)}
          walletAddress={activeWallet}
          onClose={() => setSelectedReel(null)}
          onUnlockSuccess={handleUnlockSuccess}
        />
      )}
    </div>
  );
}
