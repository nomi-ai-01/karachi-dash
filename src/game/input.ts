export type InputAction =
  | "left"
  | "right"
  | "jump"
  | "slide"
  | "pause";

export class InputSystem {
  private canvas: HTMLCanvasElement;

  private startX = 0;
  private startY = 0;

  private lastTouchTime = 0;

  private readonly swipeThreshold = 25;

  private actions: InputAction[] = [];

  private enabled = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart,
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchend",
      this.handleTouchEnd,
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchcancel",
      this.handleTouchCancel,
      { passive: false }
    );

    this.canvas.addEventListener(
      "pointerdown",
      this.handlePointerDown
    );

    window.addEventListener(
      "keydown",
      this.handleKeyDown
    );

    window.addEventListener(
      "contextmenu",
      this.handleContextMenu
    );
  }

  private handleTouchStart = (event: TouchEvent): void => {
    if (!this.enabled || event.changedTouches.length === 0) {
      return;
    }

    event.preventDefault();

    const touch = event.changedTouches[0];

    this.startX = touch.clientX;
    this.startY = touch.clientY;
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    if (!this.enabled || event.changedTouches.length === 0) {
      return;
    }

    event.preventDefault();

    const touch = event.changedTouches[0];

    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (
      absX < this.swipeThreshold &&
      absY < this.swipeThreshold
    ) {
      return;
    }

    if (absX > absY) {
      this.push(dx > 0 ? "right" : "left");
    } else {
      this.push(dy > 0 ? "slide" : "jump");
    }

    this.lastTouchTime = Date.now();
  };

  private handleTouchCancel = (): void => {
    this.startX = 0;
    this.startY = 0;
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;

    if (event.pointerType === "touch") return;

    const rect = this.canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;

    if (y < height * 0.3) {
      this.push("jump");
      return;
    }

    if (x < width / 3) {
      this.push("left");
    } else if (x > width * 2 / 3) {
      this.push("right");
    } else {
      this.push("jump");
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    if (
      event.repeat &&
      event.key !== "Escape"
    ) {
      return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      case "arrowleft":
      case "a":
        this.push("left");
        event.preventDefault();
        break;

      case "arrowright":
      case "d":
        this.push("right");
        event.preventDefault();
        break;

      case "arrowup":
      case "w":
      case " ":
        this.push("jump");
        event.preventDefault();
        break;

      case "arrowdown":
      case "s":
        this.push("slide");
        event.preventDefault();
        break;

      case "escape":
      case "p":
        this.push("pause");
        break;
    }
  };

  private handleContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private push(action: InputAction): void {
    if (this.actions.length > 12) {
      this.actions.shift();
    }

    this.actions.push(action);
  }

  consume(): InputAction[] {
    const result = this.actions;
    this.actions = [];

    return result;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.actions = [];
    }
  }

  destroy(): void {
    this.canvas.removeEventListener(
      "touchstart",
      this.handleTouchStart
    );

    this.canvas.removeEventListener(
      "touchend",
      this.handleTouchEnd
    );

    this.canvas.removeEventListener(
      "touchcancel",
      this.handleTouchCancel
    );

    this.canvas.removeEventListener(
      "pointerdown",
      this.handlePointerDown
    );

    window.removeEventListener(
      "keydown",
      this.handleKeyDown
    );

    window.removeEventListener(
      "contextmenu",
      this.handleContextMenu
    );

    this.actions = [];
  }
}
