import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet, verifyAndAuthenticate } from '@/lib/auth';
import { getPurchasesForWallet, hasPurchased, recordPurchase } from '@/lib/db';
import { getReelById } from '@/lib/reels';

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('bioscope_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    let walletAddress = await getSessionWallet(token);

    // Allow querying via query parameter if specified
    const paramWallet = req.nextUrl.searchParams.get('walletAddress');
    if (paramWallet && /^0x[a-fA-F0-9]{40}$/.test(paramWallet)) {
      walletAddress = paramWallet.toLowerCase();
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet authentication required or walletAddress param missing.' },
        { status: 401 }
      );
    }

    const purchases = getPurchasesForWallet(walletAddress);
    const purchasedReelIds = purchases.map((p) => p.reel_id);

    return NextResponse.json(
      {
        walletAddress,
        purchasedReelIds,
        purchases
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reelId, paymentTxHash, walletAddress, signature, nonce, amount } = body;

    if (!reelId) {
      return NextResponse.json({ error: 'reelId is required.' }, { status: 400 });
    }

    const reel = getReelById(reelId);
    if (!reel) {
      return NextResponse.json({ error: 'Reel not found.' }, { status: 404 });
    }

    let payingWallet: string | null = null;

    // Option A: Wallet provided signature & nonce for inline SIWX verification
    if (walletAddress && signature && nonce) {
      const auth = await verifyAndAuthenticate({ walletAddress, signature, nonce });
      payingWallet = auth.walletAddress;
    } else {
      // Option B: User is already authenticated via session cookie / token
      const token =
        req.cookies.get('bioscope_session')?.value ||
        req.headers.get('authorization')?.replace('Bearer ', '');
      payingWallet = await getSessionWallet(token);
    }

    // Fallback: If walletAddress passed directly with payment tx
    if (!payingWallet && walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      payingWallet = walletAddress.toLowerCase();
    }

    if (!payingWallet) {
      return NextResponse.json(
        { error: 'Wallet ownership verification required. Please connect wallet & sign.' },
        { status: 401 }
      );
    }

    const paymentId = paymentTxHash || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const paidAmount = amount || `${reel.priceUsdc} USDC`;

    const purchase = recordPurchase(payingWallet, reelId, paymentId, paidAmount);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully purchased ${reel.title}!`,
        purchase
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to record purchase' },
      { status: 400 }
    );
  }
}
