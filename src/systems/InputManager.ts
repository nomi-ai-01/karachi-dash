import Phaser from 'phaser';
import type { Lane } from '../entities/Rickshaw';

export type InputAction = 'left' | 'right' | 'jump' | 'slide';

/**
 * Unified input: swipe, keyboard, and optional on-screen zones.
 * Includes simple buffering so early swipes still register.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private queue: InputAction[] = [];
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private readonly SWIPE_MIN = 28;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bind();
  }

  private bind() {
    const s = this.scene;

    // Touch / pointer
    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.tracking = true;
      this.startX = p.worldX;
      this.startY = p.worldY;
    });

    s.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.tracking) return;
      this.tracking = false;
      const dx = p.worldX - this.startX;
      const dy = p.worldY - this.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < this.SWIPE_MIN && absY < this.SWIPE_MIN) return;

      if (absX > absY) {
        this.push(dx > 0 ? 'right' : 'left');
      } else {
        this.push(dy > 0 ? 'slide' : 'jump');
      }
    });

    // Keyboard
    if (s.input.keyboard) {
      s.input.keyboard.on('keydown-LEFT', () => this.push('left'));
      s.input.keyboard.on('keydown-A', () => this.push('left'));
      s.input.keyboard.on('keydown-RIGHT', () => this.push('right'));
      s.input.keyboard.on('keydown-D', () => this.push('right'));
      s.input.keyboard.on('keydown-UP', () => this.push('jump'));
      s.input.keyboard.on('keydown-W', () => this.push('jump'));
      s.input.keyboard.on('keydown-DOWN', () => this.push('slide'));
      s.input.keyboard.on('keydown-S', () => this.push('slide'));
      s.input.keyboard.on('keydown-SPACE', () => this.push('jump'));
    }
  }

  private push(action: InputAction) {
    if (this.queue.length < 3) this.queue.push(action);
  }

  /** Consume next buffered action (if any) */
  consume(): InputAction | null {
    return this.queue.shift() ?? null;
  }

  clear() {
    this.queue = [];
  }

  destroy() {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointerup');
  }
}

export function applyLaneAction(current: Lane, action: 'left' | 'right'): Lane {
  if (action === 'left') return Math.max(0, current - 1) as Lane;
  return Math.min(2, current + 1) as Lane;
}
