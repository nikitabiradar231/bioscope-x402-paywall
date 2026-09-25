import { createAuthChallenge, getAuthChallenge, markAuthChallengeUsed } from '../db';
import { verifyMessage } from 'viem';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-bioscope-x402-dev-secret-key-change-in-prod-32bytes!'
);

export function buildChallengeMessage(walletAddress: string, nonce: string, expiresAt: number): string {
  const expiresIso = new Date(expiresAt).toISOString();
  return [
    `The Bioscope - Sign In Challenge`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Nonce: ${nonce}`,
    `Expires At: ${expiresIso}`,
    `Statement: I hereby sign this challenge to verify ownership of my Ethereum wallet.`
  ].join('\n');
}

export async function createChallenge(walletAddress: string) {
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid Ethereum wallet address format.');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  createAuthChallenge(walletAddress, nonce, expiresAt);

  const message = buildChallengeMessage(walletAddress, nonce, expiresAt);

  return {
    nonce,
    message,
    expiresAt,
    walletAddress: walletAddress.toLowerCase()
  };
}

export async function verifyAndAuthenticate({
  walletAddress,
  signature,
  nonce
}: {
  walletAddress: string;
  signature: string;
  nonce: string;
}) {
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid wallet address.');
  }
  if (!signature || !nonce) {
    throw new Error('Signature and nonce are required.');
  }

  const challenge = getAuthChallenge(nonce);
  if (!challenge) {
    throw new Error('Invalid or unknown authentication nonce.');
  }

  if (challenge.used_at) {
    throw new Error('Authentication challenge nonce has already been used. Replay attempt rejected.');
  }

  if (challenge.expires_at < Date.now()) {
    throw new Error('Authentication challenge has expired.');
  }

  if (challenge.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Wallet address does not match challenge nonce recipient.');
  }

  const message = buildChallengeMessage(walletAddress, challenge.nonce, challenge.expires_at);

  let isValidSignature = false;
  try {
    isValidSignature = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`
    });
  } catch (err) {
    console.error('Signature verification error:', err);
    isValidSignature = false;
  }

  if (!isValidSignature) {
    throw new Error('Invalid wallet signature.');
  }

  // Mark challenge nonce as used to prevent replay attacks
  markAuthChallengeUsed(nonce);

  // Issue session JWT token
  const token = await new SignJWT({ walletAddress: walletAddress.toLowerCase() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET_KEY);

  return {
    token,
    walletAddress: walletAddress.toLowerCase()
  };
}

export async function getSessionWallet(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET_KEY);
    const walletAddress = verified.payload.walletAddress as string;
    return walletAddress ? walletAddress.toLowerCase() : null;
  } catch (err) {
    return null;
  }
}
