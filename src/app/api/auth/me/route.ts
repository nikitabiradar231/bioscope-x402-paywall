import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('bioscope_session')?.value || 
    req.headers.get('authorization')?.replace('Bearer ', '');

  const walletAddress = await getSessionWallet(token);

  if (!walletAddress) {
    return NextResponse.json({ authenticated: false, walletAddress: null }, { status: 200 });
  }

  return NextResponse.json({ authenticated: true, walletAddress }, { status: 200 });
}

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete('bioscope_session');
  return response;
}
