import type { GameData } from "./types";

const STORAGE_KEY = "karachi_dash_save_v1";

const DEFAULT_DATA: GameData = {
  highScore: 0,
  totalCoins: 0,
  bestDistance: 0
};

export class StorageSystem {
  private data: GameData = { ...DEFAULT_DATA };

  constructor() {
    this.load();
  }

  load(): GameData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        this.data = {
          highScore: this.safeNumber(parsed.highScore),
          totalCoins: this.safeNumber(parsed.totalCoins),
          bestDistance: this.safeNumber(parsed.bestDistance)
        };
      }
    } catch {
      this.data = { ...DEFAULT_DATA };
    }

    return this.getData();
  }

  save(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.data)
      );
    } catch {
      // Game continues even if storage is unavailable.
    }
  }

  getData(): GameData {
    return { ...this.data };
  }

  addCoins(amount: number): void {
    this.data.totalCoins += Math.max(0, Math.floor(amount));
    this.save();
  }

  spendCoins(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));

    if (this.data.totalCoins < cost) {
      return false;
    }

    this.data.totalCoins -= cost;
    this.save();

    return true;
  }

  updateHighScore(score: number): boolean {
    if (score <= this.data.highScore) {
      return false;
    }

    this.data.highScore = Math.floor(score);
    this.save();

    return true;
  }

  updateDistance(distance: number): void {
    if (distance > this.data.bestDistance) {
      this.data.bestDistance = Math.floor(distance);
      this.save();
    }
  }

  reset(): void {
    this.data = { ...DEFAULT_DATA };
    this.save();
  }

  exportBackup(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importBackup(json: string): boolean {
    try {
      const parsed = JSON.parse(json);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !Number.isFinite(parsed.highScore) ||
        !Number.isFinite(parsed.totalCoins) ||
        !Number.isFinite(parsed.bestDistance) ||
        parsed.highScore < 0 ||
        parsed.totalCoins < 0 ||
        parsed.bestDistance < 0
      ) {
        return false;
      }

      this.data = {
        highScore: Math.floor(parsed.highScore),
        totalCoins: Math.floor(parsed.totalCoins),
        bestDistance: Math.floor(parsed.bestDistance)
      };

      this.save();

      return true;
    } catch {
      return false;
    }
  }

  private safeNumber(value: unknown): number {
    return typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
      ? Math.floor(value)
      : 0;
  }
}
