import { NextRequest, NextResponse } from 'next/server';
import { verifyAndAuthenticate } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, signature, nonce } = body;

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        { error: 'walletAddress, signature, and nonce are all required.' },
        { status: 400 }
      );
    }

    const { token, walletAddress: authenticatedWallet } = await verifyAndAuthenticate({
      walletAddress,
      signature,
      nonce
    });

    const response = NextResponse.json(
      {
        success: true,
        walletAddress: authenticatedWallet,
        token
      },
      { status: 200 }
    );

    // Set HTTP-only session cookie
    response.cookies.set({
      name: 'bioscope_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/'
    });

    return response;
  } catch (err: any) {
    const status = err?.message?.includes('expired') || err?.message?.includes('used') || err?.message?.includes('Invalid') ? 400 : 401;
    return NextResponse.json({ error: err?.message || 'Authentication failed' }, { status });
  }
}
