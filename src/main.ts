import { loadAssets } from './assets';
import { Game } from './game';

const loading = document.getElementById('loading')!;
const bar = document.getElementById('loadbar')!;

(async () => {
  try {
    const assets = await loadAssets((p) => {
      bar.style.width = Math.round(p * 100) + '%';
    });
    const game = new Game(document.getElementById('app')!, assets);
    await game.init();
    loading.classList.add('hidden');
    game.run();
  } catch (e) {
    console.error(e);
    loading.innerHTML = `<p style="padding:24px;color:#fff;font:16px sans-serif">Load error: ${String(e)}</p>`;
  }
})();
