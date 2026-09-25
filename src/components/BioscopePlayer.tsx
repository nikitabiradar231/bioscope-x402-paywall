'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Reel } from '@/lib/reels';

interface BioscopePlayerProps {
  reel: Reel;
  isPurchased: boolean;
  walletAddress: string | null;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export default function BioscopePlayer({
  reel,
  isPurchased,
  walletAddress,
  onClose,
  onUnlockSuccess
}: BioscopePlayerProps) {
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [crankSpeedMs, setCrankSpeedMs] = useState<number>(400); // Frame interval speed
  const [isLockedError, setIsLockedError] = useState<boolean>(false);
  const [x402Details, setX402Details] = useState<any>(null);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [crankRotation, setCrankRotation] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play hand-crank frame loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= reel.totalFrames) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
        setCrankRotation((r) => (r + 90) % 360);
      }, crankSpeedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, crankSpeedMs, reel.totalFrames]);

  // Handle frame change & fetch frame image / entitlement status
  useEffect(() => {
    setIsLockedError(false);
    setX402Details(null);
  }, [currentFrame, reel.id]);

  const frameUrl = `/api/reels/${reel.id}/frames/${currentFrame}`;

  // Image load error handler (if 402 returns or fails)
  const handleImageError = async () => {
    try {
      const res = await fetch(frameUrl);
      if (res.status === 402) {
        const data = await res.json();
        setIsLockedError(true);
        setX402Details(data.x402 || data);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Frame load error:', err);
    }
  };

  // Perform x402 testnet coin payment
  const handlePayX402Coin = async () => {
    setIsPaying(true);
    setPaymentError(null);
    try {
      let activeWallet = walletAddress;

      // If no wallet connected, trigger connection first or use default testnet wallet
      if (!activeWallet) {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const accs = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
          activeWallet = accs[0];
        } else {
          activeWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        }
      }

      if (!activeWallet) {
        throw new Error('Please connect your Ethereum wallet to drop a testnet coin.');
      }

      // Generate a mock payment tx hash or testnet transaction proof
      const paymentTxHash = `tx_x402_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Post purchase record to server
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reelId: reel.id,
          paymentTxHash,
          walletAddress: activeWallet,
          amount: `${reel.priceUsdc} USDC`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed.');

      setIsLockedError(false);
      onUnlockSuccess();
    } catch (err: any) {
      setPaymentError(err?.message || 'x402 payment failed.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleNext = () => {
    if (currentFrame < reel.totalFrames) {
      setCurrentFrame((prev) => prev + 1);
      setCrankRotation((r) => (r + 90) % 360);
    }
  };

  const handlePrev = () => {
    if (currentFrame > 1) {
      setCurrentFrame((prev) => prev - 1);
      setCrankRotation((r) => (r - 90 + 360) % 360);
    }
  };

  const handleReplay = () => {
    setCurrentFrame(1);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Wooden Bioscope Cabinet Frame */}
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-amber-950 via-stone-900 to-amber-950 border-4 border-amber-800 rounded-3xl p-6 md:p-8 shadow-2xl border-t-amber-700 border-b-amber-950">
        
        {/* Brass corner brackets */}
        <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-yellow-500 rounded-tl-xl" />
        <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-yellow-500 rounded-tr-xl" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-yellow-500 rounded-bl-xl" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-yellow-500 rounded-br-xl" />

        {/* Bioscope Header Bar */}
        <div className="flex items-center justify-between border-b border-amber-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎥</span>
            <div>
              <h2 className="text-2xl font-serif font-bold text-amber-200">{reel.title}</h2>
              <p className="text-amber-400/80 text-xs font-mono">
                BENGAL BIOSCOPE CO. • CIRCA {reel.year} • {reel.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600 font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Viewing Hood & Ocular Lens */}
        <div className="relative bg-black rounded-2xl border-4 border-amber-900 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[360px] md:min-h-[440px]">
          
          {/* Film Sprocket Strip (Left) */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-stone-950 border-r border-amber-900/40 flex flex-col justify-between py-3 z-10">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="w-3.5 h-3 bg-black rounded-sm mx-auto border border-stone-800" />
            ))}
          </div>

          {/* Film Sprocket Strip (Right) */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-stone-950 border-l border-amber-900/40 flex flex-col justify-between py-3 z-10">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="w-3.5 h-3 bg-black rounded-sm mx-auto border border-stone-800" />
            ))}
          </div>

          {/* Hand Crank Wheel (Animated Graphic on Right Edge) */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:block">
            <div
              style={{ transform: `rotate(${crankRotation}deg)` }}
              className="w-16 h-16 rounded-full border-4 border-yellow-600 bg-amber-900 flex items-center justify-center shadow-2xl transition-transform duration-300"
            >
              <div className="w-2.5 h-8 bg-yellow-400 rounded-full origin-bottom" />
            </div>
          </div>

          {/* Viewport Frame Content */}
          {isLockedError ? (
            <div className="p-8 text-center max-w-md bg-stone-950/95 border border-amber-600/60 rounded-xl shadow-2xl z-20 flex flex-col items-center gap-4">
              <span className="text-4xl animate-bounce">🪙</span>
              <h3 className="text-xl font-serif font-bold text-amber-200">
                x402 Payment Required
              </h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Frame {currentFrame} is gated behind the x402 payment protocol. Drop a small testnet coin ({reel.priceUsdc} USDC) to unlock all frames of this reel forever!
              </p>
              
              <div className="bg-amber-950/70 border border-amber-700/50 rounded-lg p-3 w-full text-left text-xs font-mono text-amber-300 space-y-1">
                <div>• Network: <span className="text-amber-100 font-bold">Base Sepolia (84532)</span></div>
                <div>• Recipient: <span className="text-amber-100 font-bold">0x7099...79C8</span></div>
                <div>• Reel Scoped: <span className="text-amber-100 font-bold">{reel.id}</span></div>
              </div>

              {paymentError && (
                <div className="text-red-400 text-xs font-medium bg-red-950 px-3 py-1.5 rounded border border-red-800 w-full">
                  {paymentError}
                </div>
              )}

              <button
                onClick={handlePayX402Coin}
                disabled={isPaying}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-bold py-3 rounded-lg border border-yellow-300 shadow-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPaying ? 'Processing x402 Payment...' : `Drop Coin (${reel.priceUsdc} USDC) & Unlock`}
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-html-link */}
              <img
                key={frameUrl}
                src={frameUrl}
                alt={`${reel.title} Frame ${currentFrame}`}
                onError={handleImageError}
                className="max-h-[380px] w-auto object-contain rounded border border-amber-900/60 shadow-2xl sepia contrast-105 transition-opacity duration-200"
              />
              
              {/* Vintage Film Vignette & Scanlines */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/10 to-black/70 pointer-events-none" />
            </div>
          )}

          {/* Frame Indicator Overlay Badge */}
          <div className="absolute bottom-3 left-8 bg-black/80 backdrop-blur px-3 py-1 rounded border border-amber-700/60 text-amber-300 font-mono text-xs z-20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            FRAME {currentFrame.toString().padStart(2, '0')} / {reel.totalFrames.toString().padStart(2, '0')}
            {currentFrame === 1 ? ' (FREE PREVIEW)' : isPurchased ? ' (UNLOCKED)' : ''}
          </div>
        </div>

        {/* Hand-Crank Player Controls */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-amber-950/60 border border-amber-800/80 rounded-2xl p-4">
          
          {/* Main Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentFrame <= 1}
              className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-600 font-bold text-sm disabled:opacity-40 cursor-pointer"
            >
              ⏮ Prev
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-100 border border-amber-500 font-bold text-sm shadow cursor-pointer flex items-center gap-1.5"
            >
              {isPlaying ? '⏸ Pause' : '▶ Hand-Crank Play'}
            </button>

            <button
              onClick={handleNext}
              disabled={currentFrame >= reel.totalFrames}
              className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-600 font-bold text-sm disabled:opacity-40 cursor-pointer"
            >
              Next ⏭
            </button>

            <button
              onClick={handleReplay}
              className="px-3 py-2 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-300 border border-amber-700 font-semibold text-xs cursor-pointer"
            >
              🔄 Replay
            </button>
          </div>

          {/* Crank Speed Control */}
          <div className="flex items-center gap-3 text-amber-200 text-xs font-mono">
            <span>Crank Speed:</span>
            <button
              onClick={() => setCrankSpeedMs(600)}
              className={`px-2 py-1 rounded border ${crankSpeedMs === 600 ? 'bg-amber-600 text-amber-950 font-bold' : 'bg-stone-800 text-amber-300'}`}
            >
              Slow
            </button>
            <button
              onClick={() => setCrankSpeedMs(400)}
              className={`px-2 py-1 rounded border ${crankSpeedMs === 400 ? 'bg-amber-600 text-amber-950 font-bold' : 'bg-stone-800 text-amber-300'}`}
            >
              Normal
            </button>
            <button
              onClick={() => setCrankSpeedMs(200)}
              className={`px-2 py-1 rounded border ${crankSpeedMs === 200 ? 'bg-amber-600 text-amber-950 font-bold' : 'bg-stone-800 text-amber-300'}`}
            >
              Fast
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
