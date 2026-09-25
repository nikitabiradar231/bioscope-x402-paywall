import { NextResponse } from 'next/server';
import { getAllReels } from '@/lib/reels';

export async function GET() {
  const reels = getAllReels();
  return NextResponse.json({ reels }, { status: 200 });
}
