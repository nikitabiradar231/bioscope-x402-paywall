# 🎞️ The Bioscope: Drop a Coin, Watch a Reel, Never Pay Twice

[![x402 Paywall Protocol](https://img.shields.io/badge/x402-Paywall_Gated-gold.svg)](https://x402.org)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57.svg)](https://sqlite.org)

An architectural production-quality web application built with **Next.js + TypeScript**, featuring **x402 payment gating**, **Sign-In-With-X (SIWX) wallet authentication**, **server-side purchase persistence**, and **private media storage**.

---

## 📽️ Project Overview

Rituparna has digitised historical silent bioscope reels from early 20th century Bengal. The application allows viewers to explore these archival treasures using a digital hand-cranked bioscope viewer.

### Key Capabilities:
1. **Catalog Gallery**: Browse 3 digitised historical reels (*Calcutta Trams 1907*, *Durga Puja Procession 1912*, *Circus Elephant 1920*).
2. **Free Frame 1 Preview**: Frame 1 of every reel is accessible free of charge without authentication or payment.
3. **x402 Payment Gate**: Frames 2–8 require a small testnet x402 payment (`0.001 USDC` / `0.0001 ETH` on Base Sepolia) to unlock.
4. **Hand-Cranked Cinema Player**: Interactive digital bioscope viewing hood with hand-crank speed controls (Play/Pause, Prev/Next, Replay).
5. **Server-Side Purchase Persistence**: All successful purchases are recorded in SQLite under `(wallet_address, reel_id)`.
6. **Returning Viewer Entitlement**: A returning viewer with a previously purchased reel automatically bypasses payment without paying twice.
7. **Reel-Scoped Access**: Purchasing Reel 1 never unlocks Reel 2. Each purchase is strictly scoped.
8. **Private Media Storage**: Paid frame files reside in `private/reels/[reelId]/frame_[X].png` outside the public web root (`public/`). Unentitled direct access is impossible.

---

## 🏛️ Architecture & Security Model

```text
               ┌─────────────────────────────────────────┐
               │       Browser Client (Wagmi/Viem)        │
               └────────────────────┬────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
   1. GET Preview                          2. GET Gated Frame
  /api/reels/[id]/preview                 /api/reels/[id]/frames/[N]
           │                                                 │
           ▼                                                 ▼
┌──────────────────────┐                     ┌───────────────────────────────┐
│  Free Frame 1 Served │                     │   Server Auth & Entitlement   │
└──────────────────────┘                     └───────────────┬───────────────┘
                                                             │
                                        ┌────────────────────┴────────────────────┐
                                        │                                         │
                                 Has Entitlement?                        No Entitlement?
                                        │                                         │
                                        ▼                                         ▼
                            ┌──────────────────────┐                  ┌────────────────────────┐
                            │ Stream Private Frame │                  │ HTTP 402 Payment Req   │
                            │  from private/reels/ │                  │  X-Payment-Required    │
                            └──────────────────────┘                  └────────────────────────┘
```

### Authentication & Nonce Replay Prevention:
- **Challenge Endpoint** (`/api/auth/challenge`): Generates a cryptographically random 32-character hex nonce with a 5-minute expiration time, stored in SQLite `auth_challenges`.
- **SIWX Signature Verification** (`/api/auth/verify`): Verifies the wallet signature using `viem` (`verifyMessage`). Validates nonce freshness and checks if `used_at` is `NULL`. Once verified, marks the nonce as used (`used_at = Date.now()`) to prevent replay attacks, and issues an HTTP-only JWT session cookie (`bioscope_session`).

---

## 📁 Repository Structure

```text
bioscope-x402-paywall/
├── src/
│   ├── app/
│   │   ├── page.tsx                               # Bioscope main gallery page
│   │   ├── globals.css                            # Vintage bioscope CSS & Google Fonts
│   │   ├── reels/[reelId]/page.tsx                # Direct reel view page
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── challenge/route.ts             # SIWX nonce challenge generator
│   │       │   ├── verify/route.ts                # Wallet signature & replay verifier
│   │       │   └── me/route.ts                    # Session state inspector
│   │       ├── reels/
│   │       │   ├── route.ts                       # Catalog list endpoint
│   │       │   ├── [reelId]/preview/route.ts      # FREE preview (Frame 1) endpoint
│   │       │   └── [reelId]/frames/[frameNumber]/route.ts # x402 gated frame endpoint
│   │       └── purchases/route.ts                 # Purchases persistence API
│   ├── components/
│   │   ├── WalletButton.tsx                       # SIWX wallet connect & sign button
│   │   ├── ReelCard.tsx                           # Brass-framed film canister card
│   │   └── BioscopePlayer.tsx                     # Hand-cranked bioscope player modal
│   └── lib/
│       ├── auth.ts                                # Re-export for app alias
│       ├── db.ts                                  # Re-export for app alias
│       └── reels.ts                               # Re-export for app alias
├── lib/
│   ├── auth/index.ts                              # SIWX challenge & JWT auth logic
│   ├── db/index.ts                                # SQLite persistence & query helpers
│   └── reels/index.ts                             # Seeded reels catalog definition
├── private/
│   └── reels/                                     # PRIVATE GATED MEDIA STORAGE (NOT IN PUBLIC)
│       ├── reel-1/frame_[1-8].png
│       ├── reel-2/frame_[1-8].png
│       └── reel-3/frame_[1-8].png
├── scripts/
│   ├── seed.ts                                    # Frame generator & DB initializer
│   ├── test.ts                                    # 11 scored acceptance tests suite
│   └── test-http.ts                               # HTTP API integration test runner
├── .env.example                                   # Environment variable template
├── .env.local                                     # Development secrets & config
├── .gitignore                                     # Excludes secrets, DB & private media
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20.0.0 or higher (Tested on Node.js v24.11.0)
- **npm**: v10.0.0 or higher

### 1. Clone & Install Dependencies
```bash
git clone <repository-url> bioscope-x402-paywall
cd bioscope-x402-paywall
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Key variables configured in `.env.local`:
```env
JWT_SECRET=bioscope_super_secret_jwt_key_local_dev_only_987654321
DATABASE_PATH=bioscope.db
X402_PAYMENT_RECEIVER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
X402_NETWORK=base-sepolia
X402_CHAIN_ID=84532
NEXT_PUBLIC_X402_RECEIVER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### 3. Seed Database & Generate Private Media Frames
```bash
npm run seed
```
*Creates the SQLite database `bioscope.db` and generates 24 vintage bioscope frame images in the private storage directory `private/reels/`.*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the full automated acceptance test suite and HTTP integration test runner:
```bash
npm test
```

Or run the production build verification:
```bash
npm run build
```

---

## 🔍 Comprehensive Acceptance Criteria Mapping

| # | Acceptance Requirement | Implementation Detail & Verification Code Location |
|---|------------------------|---------------------------------------------------|
| **1** | **Paid reel frames MUST be gated by x402** | Route `/api/reels/[reelId]/frames/[frameNumber]` checks entitlement or `X-Payment` header for `frameNumber > 1`. If unentitled, returns `402 Payment Required` with `X-Payment-Required` header. [`src/app/api/reels/[reelId]/frames/[frameNumber]/route.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/src/app/api/reels/%5BreelId%5D/frames/%5BframeNumber%5D/route.ts#L43-L140) |
| **2** | **First frame MUST be free** | Preview route `/api/reels/[reelId]/preview` and frame route for `frameNumber === 1` explicitly serve Frame 1 for free without requiring payment or signature. [`src/app/api/reels/[reelId]/preview/route.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/src/app/api/reels/%5BreelId%5D/preview/route.ts#L10-L33) |
| **3** | **NEVER commit credentials** | Secrets are isolated in `.env.local` and `.env.example`. `.gitignore` excludes `.env*`, `*.db`, and `private/reels/`. Verified clean via automated scanner test. [`.gitignore`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/.gitignore#L33-L41) |
| **4** | **Record every successful purchase server-side** | Purchases are persisted in the SQLite `purchases` table with `wallet_address`, `reel_id`, `payment_id`, `amount`, and `created_at`. [`lib/db/index.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/lib/db/index.ts#L96-L125) |
| **5** | **Paid frame files MUST remain private** | All frames are stored under `private/reels/[reelId]/frame_[X].png`. Zero paid frames exist in `public/`. Direct static URL access returns 404. [`scripts/seed.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/scripts/seed.ts#L152-L175) |
| **6** | **Access MUST be based on the paying wallet** | Server extracts authenticated `wallet_address` from signed JWT session token or signature verification and queries SQLite database. Client flags are ignored. [`src/app/api/reels/[reelId]/frames/[frameNumber]/route.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/src/app/api/reels/%5BreelId%5D/frames/%5BframeNumber%5D/route.ts#L50-L75) |
| **7** | **Wallet ownership MUST be verified by signature** | SIWX challenge-response flow: `/api/auth/challenge` generates a nonce; `/api/auth/verify` recovers signer address using `viem` (`verifyMessage`). [`lib/auth/index.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/lib/auth/index.ts#L45-L95) |
| **8** | **Sign-in challenges MUST NOT be replayable** | Nonces stored in `auth_challenges` table with `expires_at`. Upon verification, `used_at` is set. Replay attempts are rejected with `400 Bad Request`. [`lib/auth/index.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/lib/auth/index.ts#L58-L64) |
| **9** | **Entitlement MUST be scoped to the reel** | Database queries and unique index strictly enforce `(LOWER(wallet_address), reel_id)`. Paying for Reel 1 does NOT grant access to Reel 2. [`lib/db/index.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev3/lib/db/index.ts#L127-L135) |

---

## ⚙️ Testnet Configuration & Browser Wallet Usage

1. Connect any Ethereum browser wallet (e.g., MetaMask, Rabby, Coinbase Wallet) or use the **Quick Testnet Viewer** button.
2. Network: **Base Sepolia Testnet** (Chain ID: `84532`).
3. Price per Reel: `0.001 USDC` / `0.0001 ETH`.
4. Payment Receiver: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`.

---

## 📜 License & Credits

Built for **Road to Devcon VI — Problem 3**. Digitised archival reels curated for educational and historical preservation.
