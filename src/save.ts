export interface SaveData {
  best: number;
  coins: number;
}
const KEY = 'karachi-dash-3d-save';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { best: Number(d.best) || 0, coins: Number(d.coins) || 0 };
    }
  } catch {
    /* ignore */
  }
  return { best: 0, coins: 0 };
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
