export interface Reel {
  id: string;
  title: string;
  year: string;
  location: string;
  description: string;
  totalFrames: number;
  priceUsdc: string;
  priceEth: string;
  thumbnailUrl: string;
}

export const REELS: Record<string, Reel> = {
  'reel-1': {
    id: 'reel-1',
    title: 'Calcutta Trams (1907)',
    year: '1907',
    location: 'Chowringhee Road, Calcutta',
    description: 'Archival motion reel of electric trams navigating colonial Calcutta. Silent, hand-cranked sepia footage.',
    totalFrames: 8,
    priceUsdc: '0.001',
    priceEth: '0.0001',
    thumbnailUrl: '/api/reels/reel-1/preview'
  },
  'reel-2': {
    id: 'reel-2',
    title: 'Durga Puja Procession (1912)',
    year: '1912',
    location: 'Hooghly Riverbank, Bengal',
    description: 'Festive grand immersion procession along the Hooghly River. Vibrant historical immersion ceremony.',
    totalFrames: 8,
    priceUsdc: '0.001',
    priceEth: '0.0001',
    thumbnailUrl: '/api/reels/reel-2/preview'
  },
  'reel-3': {
    id: 'reel-3',
    title: 'Circus Elephant & Acrobat (1920)',
    year: '1920',
    location: 'Great Royal Circus, Old Bengal',
    description: 'Rare digitised reel of acrobatic showmanship and an ornate Asian elephant performing under the big top.',
    totalFrames: 8,
    priceUsdc: '0.001',
    priceEth: '0.0001',
    thumbnailUrl: '/api/reels/reel-3/preview'
  }
};

export function getAllReels(): Reel[] {
  return Object.values(REELS);
}

export function getReelById(reelId: string): Reel | null {
  return REELS[reelId] || null;
}
