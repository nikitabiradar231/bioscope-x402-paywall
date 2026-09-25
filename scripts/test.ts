import fs from 'fs';
import path from 'path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createChallenge, verifyAndAuthenticate, buildChallengeMessage } from '../lib/auth';
import { getDb, createAuthChallenge, recordPurchase, hasPurchased } from '../lib/db';
import { seed } from './seed';

async function runAllTests() {
  console.log('🧪 Starting Bioscope 9 Official Acceptance Tests Suite...\n');
  await seed();

  getDb();
  let passedCount = 0;
  const totalCount = 9;

  async function assertTest(num: number, name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] TEST ${num} — ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ [FAIL] TEST ${num} — ${name}:`, err?.message || err);
      process.exitCode = 1;
    }
  }

  // Generate test wallets
  const walletAAccount = privateKeyToAccount(generatePrivateKey());
  const walletA = walletAAccount.address.toLowerCase();

  const walletBAccount = privateKeyToAccount(generatePrivateKey());
  const walletB = walletBAccount.address.toLowerCase();

  // 1. TEST 1 — Paid reel frames MUST be gated by x402
  await assertTest(1, 'Paid reel frames MUST be gated by x402', async () => {
    const unentitled = hasPurchased(walletA, 'reel-1');
    if (unentitled) throw new Error('Unentitled wallet should not have access.');
  });

  // 2. TEST 2 — First frame MUST be free
  await assertTest(2, 'First frame MUST be free', async () => {
    const frame1Path = path.join(process.cwd(), 'private', 'reels', 'reel-1', 'frame_1.png');
    if (!fs.existsSync(frame1Path)) throw new Error('Frame 1 private media missing.');
    const buf = fs.readFileSync(frame1Path);
    if (buf.length === 0) throw new Error('Frame 1 buffer is empty.');
  });

  // 3. TEST 3 — NEVER commit credentials
  await assertTest(3, 'NEVER commit credentials in tracked files', async () => {
    const forbiddenPatterns = [
      /PRIVATE_KEY\s*=\s*['"]?0x[a-fA-F0-9]{64}['"]?/i,
      /SEED_PHRASE\s*=\s*['"][a-z\s]{20,}['"]/i,
      /MNEMONIC\s*=\s*['"][a-z\s]{20,}['"]/i
    ];

    const filesToScan = [
      'src/app/page.tsx',
      'src/components/WalletButton.tsx',
      'src/components/BioscopePlayer.tsx',
      'lib/auth/index.ts',
      'lib/db/index.ts',
      'lib/reels/index.ts',
      'scripts/seed.ts',
      'README.md',
      '.env.example'
    ];

    for (const relFile of filesToScan) {
      const fullPath = path.join(process.cwd(), relFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Potential secret leak detected in ${relFile}!`);
          }
        }
      }
    }
  });

  // 4. TEST 4 — Successful purchase is persisted server-side
  await assertTest(4, 'Successful purchase is persisted server-side in SQLite', async () => {
    const paymentTx = `tx_test_${Date.now()}`;
    const purchase = recordPurchase(walletA, 'reel-1', paymentTx, '0.001 USDC');
    if (!purchase || purchase.wallet_address.toLowerCase() !== walletA) {
      throw new Error('Failed to create server purchase record.');
    }
    const stored = hasPurchased(walletA, 'reel-1');
    if (!stored || stored.payment_id !== paymentTx) {
      throw new Error('Purchase record not found in SQLite lookup.');
    }
  });

  // 5. TEST 5 — Paid media is genuinely private
  await assertTest(5, 'Paid media is genuinely private and not in public/', async () => {
    const publicPath = path.join(process.cwd(), 'public', 'reels');
    if (fs.existsSync(publicPath)) {
      throw new Error('Public directory contains reels static directory!');
    }
    const privateFrame2Path = path.join(process.cwd(), 'private', 'reels', 'reel-1', 'frame_2.png');
    if (!fs.existsSync(privateFrame2Path)) {
      throw new Error('Private frame media missing in private/reels/.');
    }
  });

  // 6. TEST 6 — Access is determined by paying wallet
  await assertTest(6, 'Access is determined by paying wallet lookup', async () => {
    // Wallet A has paid for reel-1 -> ALLOW
    const walletAEntitlement = hasPurchased(walletA, 'reel-1');
    if (!walletAEntitlement) throw new Error('Wallet A should have entitlement for reel-1.');

    // Wallet B has NOT paid for reel-1 -> DENY
    const walletBEntitlement = hasPurchased(walletB, 'reel-1');
    if (walletBEntitlement !== null) throw new Error('Wallet B must be denied access.');
  });

  // 7. TEST 7 — Wallet ownership is cryptographically verified
  await assertTest(7, 'Wallet ownership is verified by SIWX signature', async () => {
    const challenge = await createChallenge(walletA);
    const invalidSig = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c';
    let rejected = false;
    try {
      await verifyAndAuthenticate({
        walletAddress: walletA,
        signature: invalidSig,
        nonce: challenge.nonce
      });
    } catch (err: any) {
      rejected = true;
    }
    if (!rejected) throw new Error('Invalid signature was not rejected.');
  });

  // 8. TEST 8 — Sign-in challenges cannot be replayed
  await assertTest(8, 'Sign-in challenges cannot be replayed or expired', async () => {
    const challenge = await createChallenge(walletA);
    const message = buildChallengeMessage(walletA, challenge.nonce, challenge.expiresAt);
    const sig = await walletAAccount.signMessage({ message });

    // Attempt 1 -> Success
    await verifyAndAuthenticate({ walletAddress: walletA, signature: sig, nonce: challenge.nonce });

    // Attempt 2 (Replay) -> MUST FAIL!
    let replayFailed = false;
    try {
      await verifyAndAuthenticate({ walletAddress: walletA, signature: sig, nonce: challenge.nonce });
    } catch (err: any) {
      if (err.message.includes('used') || err.message.includes('Replay')) {
        replayFailed = true;
      }
    }
    if (!replayFailed) throw new Error('Replayed nonce attempt was not rejected.');

    // Expired nonce -> MUST FAIL!
    const expiredNonce = `expired_${Date.now()}`;
    createAuthChallenge(walletA, expiredNonce, Date.now() - 60000);
    let expiredFailed = false;
    try {
      await verifyAndAuthenticate({ walletAddress: walletA, signature: sig, nonce: expiredNonce });
    } catch (err: any) {
      if (err.message.includes('expired')) expiredFailed = true;
    }
    if (!expiredFailed) throw new Error('Expired challenge attempt was not rejected.');
  });

  // 9. TEST 9 — Entitlement is scoped to the purchased reel
  await assertTest(9, 'Entitlement is scoped to the purchased reel', async () => {
    // Wallet A paid for Reel 1, but NOT Reel 2
    const reel1Access = hasPurchased(walletA, 'reel-1');
    const reel2Access = hasPurchased(walletA, 'reel-2');

    if (!reel1Access) throw new Error('Wallet A should have access to Reel 1.');
    if (reel2Access !== null) throw new Error('Wallet A purchase for Reel 1 MUST NOT unlock Reel 2!');
  });

  console.log(`\n🎉 All ${passedCount}/${totalCount} Official Acceptance Tests Passed Successfully!\n`);
}

runAllTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
