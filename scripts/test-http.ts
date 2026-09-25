import { POST as challengeHandler } from '../src/app/api/auth/challenge/route';
import { POST as verifyHandler } from '../src/app/api/auth/verify/route';
import { GET as previewHandler } from '../src/app/api/reels/[reelId]/preview/route';
import { GET as frameHandler } from '../src/app/api/reels/[reelId]/frames/[frameNumber]/route';
import { GET as reelsHandler } from '../src/app/api/reels/route';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

async function runHttpTests() {
  console.log('🌐 Running Bioscope HTTP API Route Integration Tests...\n');

  // Test 1: GET /api/reels
  const reelsRes = await reelsHandler();
  const reelsData = await reelsRes.json();
  if (reelsRes.status !== 200 || !reelsData.reels || reelsData.reels.length < 3) {
    throw new Error('Failed GET /api/reels catalog endpoint test.');
  }
  console.log('✅ [HTTP PASS] GET /api/reels returned 3 seeded reels.');

  // Test 2: GET /api/reels/reel-1/preview
  const previewReq = new NextRequest('http://localhost:3000/api/reels/reel-1/preview');
  const previewRes = await previewHandler(previewReq, { params: Promise.resolve({ reelId: 'reel-1' }) });
  if (previewRes.status !== 200 || previewRes.headers.get('content-type') !== 'image/png') {
    throw new Error('Failed GET /api/reels/reel-1/preview endpoint test.');
  }
  console.log('✅ [HTTP PASS] GET /api/reels/reel-1/preview served free frame 1.');

  // Test 3: GET /api/reels/reel-1/frames/2 (Unauthenticated / Unpaid -> MUST RETURN 402)
  const frame2Req = new NextRequest('http://localhost:3000/api/reels/reel-1/frames/2');
  const frame2Res = await frameHandler(frame2Req, { params: Promise.resolve({ reelId: 'reel-1', frameNumber: '2' }) });
  if (frame2Res.status !== 402) {
    throw new Error(`Expected HTTP 402 Payment Required for frame 2, got status ${frame2Res.status}`);
  }
  const x402Header = frame2Res.headers.get('x-payment-required');
  if (!x402Header || !x402Header.includes('x402')) {
    throw new Error('HTTP 402 response missing X-Payment-Required header.');
  }
  console.log('✅ [HTTP PASS] GET /api/reels/reel-1/frames/2 returned HTTP 402 Payment Required with X-Payment-Required header.');

  // Test 4: POST /api/auth/challenge
  const testAccount = privateKeyToAccount(generatePrivateKey());
  const walletAddress = testAccount.address.toLowerCase();

  const chalReq = new NextRequest('http://localhost:3000/api/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ walletAddress })
  });
  const chalRes = await challengeHandler(chalReq);
  const chalData = await chalRes.json();
  if (chalRes.status !== 200 || !chalData.nonce || !chalData.message) {
    throw new Error('Failed POST /api/auth/challenge SIWX challenge endpoint.');
  }
  console.log('✅ [HTTP PASS] POST /api/auth/challenge generated SIWX nonce.');

  // Test 5: Sign & Verify SIWX flow
  const signature = await testAccount.signMessage({ message: chalData.message });
  const verifyReq = new NextRequest('http://localhost:3000/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ walletAddress, signature, nonce: chalData.nonce })
  });
  const verifyRes = await verifyHandler(verifyReq);
  const verifyData = await verifyRes.json();
  if (verifyRes.status !== 200 || !verifyData.token) {
    throw new Error('Failed POST /api/auth/verify SIWX signature verification.');
  }
  console.log('✅ [HTTP PASS] POST /api/auth/verify successfully verified signature and issued JWT cookie.');

  // Test 6: Replay attack on used nonce -> MUST RETURN 400
  const replayReq = new NextRequest('http://localhost:3000/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ walletAddress, signature, nonce: chalData.nonce })
  });
  const replayRes = await verifyHandler(replayReq);
  if (replayRes.status !== 400) {
    throw new Error('Replayed nonce verify attempt was not rejected with status 400.');
  }
  console.log('✅ [HTTP PASS] Replayed nonce verify attempt correctly rejected with 400 Bad Request.');

  console.log('\n🎉 All HTTP Route Integration Tests Passed!\n');
}

runHttpTests().catch((err) => {
  console.error('HTTP route test failed:', err);
  process.exit(1);
});
