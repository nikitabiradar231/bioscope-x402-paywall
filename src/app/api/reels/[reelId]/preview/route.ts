import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getReelById } from '@/lib/reels';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reelId: string }> }
) {
  const { reelId } = await params;
  const reel = getReelById(reelId);

  if (!reel) {
    return NextResponse.json({ error: 'Reel not found.' }, { status: 404 });
  }

  // First frame is stored privately in private/reels/[reelId]/frame_1.png
  const framePath = path.join(process.cwd(), 'private', 'reels', reelId, 'frame_1.png');

  if (!fs.existsSync(framePath)) {
    return NextResponse.json({ error: 'Preview frame asset not found.' }, { status: 404 });
  }

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
