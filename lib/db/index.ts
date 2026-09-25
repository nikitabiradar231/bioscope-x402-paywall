import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'bioscope.db');

let dbInstance: any = null;

export function getDb() {
  if (!dbInstance) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      dbInstance = new Database(DB_PATH);
      dbInstance.pragma('journal_mode = WAL');
    } catch (err) {
      console.warn('better-sqlite3 failed or unavailable, falling back to node:sqlite', err);
      // Fallback to node:sqlite if better-sqlite3 native binary issue
      const { DatabaseSync } = require('node:sqlite');
      dbInstance = new DatabaseSync(DB_PATH);
    }

    initDbSchema(dbInstance);
  }
  return dbInstance;
}

function initDbSchema(db: any) {
  // Purchases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      reel_id TEXT NOT NULL,
      payment_id TEXT NOT NULL,
      amount TEXT NOT NULL DEFAULT '0.001 ETH',
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_wallet_reel 
    ON purchases(wallet_address, reel_id);

    CREATE TABLE IF NOT EXISTS auth_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nonce TEXT NOT NULL UNIQUE,
      wallet_address TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_auth_challenges_nonce ON auth_challenges(nonce);
  `);
}

export interface PurchaseRecord {
  id?: number;
  wallet_address: string;
  reel_id: string;
  payment_id: string;
  amount?: string;
  created_at: number;
}

export interface AuthChallenge {
  id?: number;
  nonce: string;
  wallet_address: string;
  expires_at: number;
  used_at?: number | null;
}

export function createAuthChallenge(walletAddress: string, nonce: string, expiresAt: number): void {
  const db = getDb();
  const normalizedWallet = walletAddress.toLowerCase();
  const stmt = db.prepare(`
    INSERT INTO auth_challenges (nonce, wallet_address, expires_at, used_at)
    VALUES (?, ?, ?, NULL)
  `);
  stmt.run(nonce, normalizedWallet, expiresAt);
}

export function getAuthChallenge(nonce: string): AuthChallenge | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM auth_challenges WHERE nonce = ?
  `);
  const row = stmt.get ? stmt.get(nonce) : (stmt.all ? stmt.all(nonce)[0] : null);
  return (row as AuthChallenge) || null;
}

export function markAuthChallengeUsed(nonce: string): void {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE auth_challenges SET used_at = ? WHERE nonce = ? AND used_at IS NULL
  `);
  stmt.run(now, nonce);
}

export function recordPurchase(
  walletAddress: string,
  reelId: string,
  paymentId: string,
  amount: string = '0.001 ETH'
): PurchaseRecord {
  const db = getDb();
  const normalizedWallet = walletAddress.toLowerCase();
  const now = Date.now();

  try {
    const stmt = db.prepare(`
      INSERT INTO purchases (wallet_address, reel_id, payment_id, amount, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(normalizedWallet, reelId, paymentId, amount, now);
  } catch (err: any) {
    // If already exists due to unique constraint, return existing
    if (err?.message?.includes('UNIQUE') || err?.code === 'SQLITE_CONSTRAINT') {
      const existing = hasPurchased(normalizedWallet, reelId);
      if (existing) return existing;
    }
    throw err;
  }

  return {
    wallet_address: normalizedWallet,
    reel_id: reelId,
    payment_id: paymentId,
    amount,
    created_at: now
  };
}

export function hasPurchased(walletAddress: string, reelId: string): PurchaseRecord | null {
  const db = getDb();
  const normalizedWallet = walletAddress.toLowerCase();
  const stmt = db.prepare(`
    SELECT * FROM purchases WHERE LOWER(wallet_address) = LOWER(?) AND reel_id = ?
  `);
  const row = stmt.get ? stmt.get(normalizedWallet, reelId) : (stmt.all ? stmt.all(normalizedWallet, reelId)[0] : null);
  return (row as PurchaseRecord) || null;
}

export function getPurchasesForWallet(walletAddress: string): PurchaseRecord[] {
  const db = getDb();
  const normalizedWallet = walletAddress.toLowerCase();
  const stmt = db.prepare(`
    SELECT * FROM purchases WHERE LOWER(wallet_address) = LOWER(?) ORDER BY created_at DESC
  `);
  return (stmt.all ? stmt.all(normalizedWallet) : []) as PurchaseRecord[];
}
