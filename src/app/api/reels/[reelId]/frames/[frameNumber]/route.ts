import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getReelById } from '@/lib/reels';
import { getSessionWallet } from '@/lib/auth';
import { hasPurchased, recordPurchase } from '@/lib/db';
import { createX402PaymentRequiredResponse } from '@/lib/x402';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reelId: string; frameNumber: string }> }
) {
  const { reelId, frameNumber: frameNumStr } = await params;
  const reel = getReelById(reelId);

  if (!reel) {
    return NextResponse.json({ error: 'Reel not found.' }, { status: 404 });
  }

  const frameNum = parseInt(frameNumStr, 10);
  if (isNaN(frameNum) || frameNum < 1 || frameNum > reel.totalFrames) {
    return NextResponse.json(
      { error: `Invalid frame number. Reel contains frames 1 through ${reel.totalFrames}.` },
      { status: 400 }
    );
  }

  // Path to private media file
  const framePath = path.join(process.cwd(), 'private', 'reels', reelId, `frame_${frameNum}.png`);

  if (!fs.existsSync(framePath)) {
    return NextResponse.json({ error: 'Frame file not found on server.' }, { status: 404 });
  }

  // TEST 2 REQUIREMENT: First frame is ALWAYS FREE
  if (frameNum === 1) {
    const fileBuffer = fs.readFileSync(framePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Bioscope-Frame': '1',
        'X-Bioscope-Access': 'free-preview'
      }
    });
  }

  // For Frames > 1: Check wallet entitlement & x402 payment header
  const token =
    req.cookies.get('bioscope_session')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  const authenticatedWallet = await getSessionWallet(token);

  // 1. Check existing purchase record in server database for authenticated wallet
  if (authenticatedWallet) {
    const purchase = hasPurchased(authenticatedWallet, reelId);
    if (purchase) {
      const fileBuffer = fs.readFileSync(framePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=60',
          'X-Bioscope-Frame': frameNum.toString(),
          'X-Bioscope-Entitled-Wallet': authenticatedWallet,
          'X-Bioscope-Reel-Id': reelId
        }
      });
    }
  }

  // 2. Check if request includes x402 payment header (e.g. X-Payment: tx_... or X-Wallet-Payment: wallet:tx)
  const xPaymentHeader = req.headers.get('x-payment') || req.headers.get('x-402-payment');
  if (xPaymentHeader) {
    try {
      let payingWallet = authenticatedWallet;
      let txHash = xPaymentHeader;

      if (xPaymentHeader.includes(':')) {
        const parts = xPaymentHeader.split(':');
        payingWallet = parts[0].toLowerCase();
        txHash = parts[1];
      }

      if (payingWallet && txHash) {
        // Record purchase in server-side database
        recordPurchase(payingWallet, reelId, txHash, `${reel.priceUsdc} USDC`);

        const fileBuffer = fs.readFileSync(framePath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'private, max-age=60',
            'X-Bioscope-Frame': frameNum.toString(),
            'X-Bioscope-Entitled-Wallet': payingWallet,
            'X-Bioscope-Payment-Id': txHash
          }
        });
      }
    } catch (err) {
      console.error('Failed to process x402 payment header:', err);
    }
  }

  // TEST 1 REQUIREMENT: Unentitled & no valid payment -> Return genuine x402 HTTP 402 Payment Required!
  return createX402PaymentRequiredResponse({
    reelId,
    frameNumber: frameNum,
    priceUsdc: reel.priceUsdc
  });
}
