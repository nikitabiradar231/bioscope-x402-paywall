'use client';

import React, { useState, useEffect } from 'react';
import { createWalletClient, custom } from 'viem';

interface WalletButtonProps {
  onAuthChange?: (walletAddress: string | null) => void;
}

export default function WalletButton({ onAuthChange }: WalletButtonProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.walletAddress) {
        setWalletAddress(data.walletAddress);
        setIsAuthenticated(true);
        if (onAuthChange) onAuthChange(data.walletAddress);
      } else {
        setWalletAddress(null);
        setIsAuthenticated(false);
        if (onAuthChange) onAuthChange(null);
      }
    } catch (err) {
      console.error('Failed to check session:', err);
    }
  };

  const connectAndSign = async (targetAddress?: string) => {
    setLoading(true);
    setError(null);
    try {
      let address = targetAddress;

      // 1. Get wallet address from browser provider if not passed
      if (!address) {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const client = createWalletClient({
            transport: custom((window as any).ethereum)
          });
          const [acc] = await client.requestAddresses();
          address = acc;
        } else {
          // Fallback to simulated testnet viewer wallet for browser testing without extension
          address = '0x1234567890abcdef1234567890abcdef12345678';
        }
      }

      if (!address) {
        throw new Error('No Ethereum wallet detected.');
      }

      // 2. Request SIWX Challenge from server
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challengeData.error || 'Failed to generate challenge');

      let signature = '';

      // 3. Sign challenge message using browser wallet or testnet signature
      if (typeof window !== 'undefined' && (window as any).ethereum && targetAddress !== '0x1234567890abcdef1234567890abcdef12345678') {
        const client = createWalletClient({
          transport: custom((window as any).ethereum)
        });
        signature = await client.signMessage({
          account: address as `0x${string}`,
          message: challengeData.message
        });
      } else {
        // Testnet simulated signature (derived from challenge)
        signature = '0x' + Array.from(new TextEncoder().encode(challengeData.message + address))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 130)
          .padEnd(130, '0');
      }

      // 4. Verify signature with server
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          nonce: challengeData.nonce
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Signature verification failed');

      setWalletAddress(verifyData.walletAddress);
      setIsAuthenticated(true);
      if (onAuthChange) onAuthChange(verifyData.walletAddress);
    } catch (err: any) {
      console.error('Wallet connect error:', err);
      setError(err?.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
      setWalletAddress(null);
      setIsAuthenticated(false);
      if (onAuthChange) onAuthChange(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {isAuthenticated && walletAddress ? (
        <div className="flex items-center gap-3 bg-amber-950/80 border border-amber-600/60 rounded-lg px-4 py-2 text-amber-200 text-sm shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-amber-300 font-semibold">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          <span className="bg-amber-800/60 text-amber-100 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-500/40">
            SIWX Authenticated
          </span>
          <button
            onClick={handleLogout}
            className="text-amber-400 hover:text-amber-100 text-xs font-semibold ml-2 underline transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => connectAndSign()}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-amber-100 font-bold px-4 py-2.5 rounded-lg border border-yellow-500/50 shadow-lg shadow-amber-950/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 11V7a1 1 0 012 0v4a1 1 0 01-2 0z" />
            </svg>
            {loading ? 'Authenticating SIWX...' : 'Connect Wallet & Sign In'}
          </button>

          {/* Testnet quick connect fallback for quick testing */}
          <button
            onClick={() => connectAndSign('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
            disabled={loading}
            title="Connect testnet viewer wallet"
            className="bg-amber-900/60 hover:bg-amber-800/80 text-amber-300 text-xs font-semibold px-2.5 py-2.5 rounded-lg border border-amber-700/50 cursor-pointer"
          >
            🔑 Quick Testnet Viewer
          </button>
        </div>
      )}
      {error && <span className="text-red-400 text-xs font-medium bg-red-950/60 px-2 py-1 rounded border border-red-800">{error}</span>}
    </div>
  );
}
