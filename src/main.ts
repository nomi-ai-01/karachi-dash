import "./style.css";

import {
  KarachiDashGame,
  type GameSnapshot
} from "./game/game";

const canvas = document.getElementById(
  "gameCanvas"
) as HTMLCanvasElement;

const app = document.getElementById("app");

if (!canvas || !app) {
  throw new Error("Game canvas or app container missing.");
}

const game = new KarachiDashGame(canvas);

let currentState = "";

function createButton(
  label: string,
  action: string,
  extraClass = ""
): string {
  return `
    <button
      class="game-button ${extraClass}"
      data-action="${action}"
      type="button"
    >
      ${label}
    </button>
  `;
}

function renderMenu(snapshot: GameSnapshot): string {
  return `
    <section class="screen menu-screen">

      <div class="brand">
        <div class="brand-kicker">
          PRESENTING THE STREETS OF PAKISTAN
        </div>

        <h1>
          KARACHI
          <span>DASH</span>
        </h1>

        <div class="brand-decoration">
          ✦ ━━━━━━━━━ ✦
        </div>

        <p class="brand-subtitle">
          RICKSHAW RACING ADVENTURE
        </p>
      </div>

      <div class="menu-stats">

        <div class="stat-card">
          <span>🏆 BEST SCORE</span>
          <strong>${snapshot.highScore.toLocaleString()}</strong>
        </div>

        <div class="stat-card">
          <span>🪙 TOTAL COINS</span>
          <strong>${snapshot.totalCoins.toLocaleString()}</strong>
        </div>

      </div>

      <div class="menu-message">
        READY FOR A RIDE?
        <span>Swipe, dodge and collect!</span>
      </div>

      <div class="menu-actions">

        ${createButton(
          "▶  PLAY NOW",
          "play",
          "primary-button"
        )}

        <div class="controls-hint">
          <span>← →</span>
          CHANGE LANE

          <span>↑</span>
          JUMP

          <span>↓</span>
          SLIDE
        </div>

      </div>

      <div class="menu-footer">
        MADE WITH ♥ IN PAKISTAN
      </div>

    </section>
  `;
}

function renderPause(): string {
  return `
    <section class="screen modal-screen">

      <div class="modal-card">

        <div class="modal-decoration">✦</div>

        <h2>TAKE A BREAK!</h2>

        <p>Your rickshaw is waiting.</p>

        ${createButton(
          "▶  RESUME",
          "resume",
          "primary-button"
        )}

        ${createButton(
          "↻  RESTART",
          "restart",
          "secondary-button"
        )}

        ${createButton(
          "⌂  HOME",
          "home",
          "secondary-button"
        )}

      </div>

    </section>
  `;
}

function renderGameOver(snapshot: GameSnapshot): string {
  return `
    <section class="screen modal-screen">

      <div class="modal-card gameover-card">

        <div class="gameover-icon">🛺</div>

        <div class="gameover-label">
          ${snapshot.isNewRecord
            ? "✦ NEW HIGH SCORE! ✦"
            : "THE RIDE HAS ENDED"}
        </div>

        <h2>
          ${snapshot.isNewRecord
            ? "ZABARDAST!"
            : "GAME OVER"}
        </h2>

        <div class="result-stats">

          <div>
            <span>YOUR SCORE</span>
            <strong>${snapshot.score.toLocaleString()}</strong>
          </div>

          <div>
            <span>DISTANCE</span>
            <strong>${snapshot.distance} m</strong>
          </div>

          <div>
            <span>COINS EARNED</span>
            <strong>🪙 ${snapshot.coins}</strong>
          </div>

          <div>
            <span>BEST SCORE</span>
            <strong>${snapshot.highScore.toLocaleString()}</strong>
          </div>

        </div>

        ${createButton(
          "↻  RIDE AGAIN",
          "restart",
          "primary-button"
        )}

        ${createButton(
          "⌂  HOME",
          "home",
          "secondary-button"
        )}

        <p class="gameover-footer">
          HAR RIDE EK NAYA CHANCE!
        </p>

      </div>

    </section>
  `;
}

function renderPlaying(): string {
  return `
    <div class="playing-ui">

      <button
        class="pause-button"
        data-action="pause"
        type="button"
        aria-label="Pause game"
      >
        Ⅱ
      </button>

      <div class="playing-hint">
        SWIPE TO MOVE
      </div>

    </div>
  `;
}

function renderUI(snapshot: GameSnapshot): void {
  const overlay = document.getElementById("game-overlay");

  if (!overlay) return;

  const nextState = snapshot.state;

  // Avoid recreating buttons every time the UI is updated.
  if (nextState === currentState) return;

  currentState = nextState;

  switch (snapshot.state) {
    case "menu":
      overlay.innerHTML = renderMenu(snapshot);
      break;

    case "playing":
      overlay.innerHTML = renderPlaying();
      break;

    case "paused":
      overlay.innerHTML = renderPause();
      break;

    case "gameover":
      overlay.innerHTML = renderGameOver(snapshot);
      break;
  }
}

app.insertAdjacentHTML(
  "beforeend",
  '<div id="game-overlay"></div>'
);

game.subscribe(renderUI);

app.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  const button = target.closest<HTMLButtonElement>(
    "[data-action]"
  );

  if (!button) return;

  const action = button.dataset.action;

  switch (action) {
    case "play":
      game.startRun();
      break;

    case "pause":
      game.pause();
      break;

    case "resume":
      game.resume();
      break;

    case "restart":
      game.startRun();
      break;

    case "home":
      game.returnToMenu();
      break;
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    game.state === "playing"
  ) {
    game.pause();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .catch((error) => {
        console.warn(
          "Offline support could not be registered:",
          error
        );
      });
  });
}

game.start();
