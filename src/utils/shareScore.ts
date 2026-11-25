/**
 * Build a shareable score message / try Web Share API.
 */
export function shareScore(score: number, distance: number, skin: string): void {
  const text = `I scored ${score} in Karachi Dash (skin: ${skin})!\nDistance: ${Math.floor(distance)}m\nCan you beat me? 🚗💨\n#KarachiDash`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator
      .share({ title: 'Karachi Dash', text })
      .catch(() => copyFallback(text));
  } else {
    copyFallback(text);
  }
}

function copyFallback(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      () => alert('Score copied! Paste it anywhere.'),
      () => prompt('Copy your score:', text),
    );
  } else {
    prompt('Copy your score:', text);
  }
}
