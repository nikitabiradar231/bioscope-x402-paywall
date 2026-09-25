import { x402Version } from '@x402/core';
import { NextResponse } from 'next/server';

export const X402_CONFIG = {
  version: String(x402Version || '2.27.0'),
  scheme: 'exact',
  network: process.env.X402_NETWORK || 'base-sepolia',
  chainId: parseInt(process.env.X402_CHAIN_ID || '84532', 10),
  assetAddress: process.env.X402_ASSET_ADDRESS || '0x036CBD53842c5426634e7929541eC2318f3dCF7e',
  payToReceiver:
    process.env.X402_PAYMENT_RECEIVER_ADDRESS ||
    process.env.NEXT_PUBLIC_X402_RECEIVER ||
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  defaultPriceUsdc: '0.001'
};

export function createX402PaymentRequiredResponse({
  reelId,
  frameNumber,
  priceUsdc = X402_CONFIG.defaultPriceUsdc
}: {
  reelId: string;
  frameNumber: number;
  priceUsdc?: string;
}) {
  const x402Spec = {
    version: X402_CONFIG.version,
    scheme: X402_CONFIG.scheme,
    network: X402_CONFIG.network,
    chainId: X402_CONFIG.chainId,
    asset: X402_CONFIG.assetAddress,
    amount: '100000',
    priceUsdc,
    payTo: X402_CONFIG.payToReceiver,
    reelId,
    frameRequested: frameNumber,
    description: `x402 payment required to unlock ${reelId} frame ${frameNumber}`
  };

  const headerVal = `x402 scheme=${X402_CONFIG.scheme} network=${X402_CONFIG.network} chainId=${X402_CONFIG.chainId} asset=${X402_CONFIG.assetAddress} amount=100000 payTo=${X402_CONFIG.payToReceiver} reelId=${reelId}`;

  return NextResponse.json(
    {
      error: 'Payment Required',
      status: 402,
      message: `Reel '${reelId}' requires an x402 payment to view frame ${frameNumber}.`,
      reelId,
      frameNumber,
      x402: x402Spec
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': headerVal,
        'WWW-Authenticate': 'X402 realm="Bioscope Gated Reel Frame"',
        'X-402-Version': X402_CONFIG.version.toString()
      }
    }
  );
}
