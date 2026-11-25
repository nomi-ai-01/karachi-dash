/** Daily mission definitions – progress is tracked in save.missions.daily */

export interface MissionDef {
  id: string;
  label: string;
  target: number;
  /** How progress is measured */
  type: 'coins' | 'distance' | 'dodge_bus' | 'combo' | 'runs' | 'near_miss';
  rewardCoins: number;
  rewardGems?: number;
}

export const MISSION_POOL: MissionDef[] = [
  { id: 'coins_50', label: 'Collect 50 coins', target: 50, type: 'coins', rewardCoins: 30 },
  { id: 'coins_100', label: 'Collect 100 coins', target: 100, type: 'coins', rewardCoins: 60 },
  { id: 'dist_500', label: 'Run 500 metres', target: 500, type: 'distance', rewardCoins: 40 },
  { id: 'dist_1000', label: 'Run 1000 metres', target: 1000, type: 'distance', rewardCoins: 80 },
  { id: 'dodge_5', label: 'Dodge 5 buses', target: 5, type: 'dodge_bus', rewardCoins: 50 },
  { id: 'combo_10', label: 'Reach x10 combo', target: 10, type: 'combo', rewardCoins: 45 },
  { id: 'runs_3', label: 'Complete 3 runs', target: 3, type: 'runs', rewardCoins: 35 },
  { id: 'near_5', label: 'Get 5 near-misses', target: 5, type: 'near_miss', rewardCoins: 55 },
];

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Pick 3 daily missions, resetting if the day changed */
export function ensureDailyMissions(save: {
  missions: { daily: { id: string; progress: number; target: number; claimed: boolean }[]; lastReset: string };
}): void {
  const today = todayKey();
  if (save.missions.lastReset === today && save.missions.daily.length >= 3) return;

  // Shuffle pool and take 3
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  save.missions.daily = shuffled.slice(0, 3).map((m) => ({
    id: m.id,
    progress: 0,
    target: m.target,
    claimed: false,
  }));
  save.missions.lastReset = today;
}

export function getMissionDef(id: string): MissionDef | undefined {
  return MISSION_POOL.find((m) => m.id === id);
}
