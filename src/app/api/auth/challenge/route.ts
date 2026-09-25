import { NextRequest, NextResponse } from 'next/server';
import { createChallenge } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required.' }, { status: 400 });
    }

    const challenge = await createChallenge(walletAddress);
    return NextResponse.json(challenge, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create challenge' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress query parameter is required.' }, { status: 400 });
    }

    const challenge = await createChallenge(walletAddress);
    return NextResponse.json(challenge, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create challenge' }, { status: 400 });
  }
}
