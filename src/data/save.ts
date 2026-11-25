export interface SaveData {
  version: number;
  highScore: number;
  bestDistance: number;
  coins: number;
  gems: number;
  unlockedSkins: string[];
  selectedSkin: string;
  settings: {
    music: boolean;
    sfx: boolean;
    haptics: boolean;
    reduceMotion: boolean;
  };
  missions: {
    daily: { id: string; progress: number; target: number; claimed: boolean }[];
    lastReset: string;
  };
  dailyReward: {
    lastClaim: string;
    streak: number;
  };
  worldStars: Record<string, number>;
  totalRuns: number;
  totalCoinsEarned: number;
}

const KEY = 'karachi-dash-v1';
const VERSION = 2;

const DEFAULT: SaveData = {
  version: VERSION,
  highScore: 0,
  bestDistance: 0,
  coins: 25,
  gems: 0,
  unlockedSkins: ['classic'],
  selectedSkin: 'classic',
  settings: { music: true, sfx: true, haptics: true, reduceMotion: false },
  missions: { daily: [], lastReset: '' },
  dailyReward: { lastClaim: '', streak: 0 },
  worldStars: {},
  totalRuns: 0,
  totalCoinsEarned: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw) as SaveData;
    return { ...structuredClone(DEFAULT), ...data, version: VERSION };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* blocked */ }
}

export function exportSave(): string {
  return JSON.stringify(loadSave());
}

export function importSave(json: string): boolean {
  try {
    const data = JSON.parse(json) as SaveData;
    if (typeof data.highScore !== 'number') return false;
    writeSave({ ...structuredClone(DEFAULT), ...data, version: VERSION });
    return true;
  } catch {
    return false;
  }
}

/** Skin shop catalog */
export const SKIN_CATALOG = [
  { id: 'classic', name: 'Classic Red', price: 0 },
  { id: 'emerald', name: 'Emerald', price: 150 },
  { id: 'royal', name: 'Royal Purple', price: 200 },
  { id: 'sunset', name: 'Sunset', price: 200 },
  { id: 'ocean', name: 'Ocean Blue', price: 250 },
  { id: 'marigold', name: 'Marigold', price: 250 },
  { id: 'midnight', name: 'Midnight', price: 300 },
  { id: 'cream', name: 'Cream Gold', price: 350 },
] as const;
