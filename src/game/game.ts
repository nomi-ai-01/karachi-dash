private checkCoinCollisions(): void {
  for (const coin of this.coins) {
    if (coin.collected) continue;

    const laneDistance = Math.abs(
      this.player.visualLane - coin.lane
    );

    const coinDistance = Math.abs(
      coin.y - this.player.y
    );

    const magnetActive =
      this.hasPower("magnet") &&
      coinDistance < GAME_CONFIG.coins.magnetRadius;

    const laneMatch = magnetActive
      ? laneDistance < 2.1
      : laneDistance < 0.32;

    const distanceMatch =
      coinDistance < GAME_CONFIG.coins.pickupRadius ||
      magnetActive;

    if (laneMatch && distanceMatch) {
      coin.collected = true;

      const multiplier =
        this.hasPower("double") ? 2 : 1;

      this.runCoins += multiplier;
      this.score += 10 * multiplier;

      this.createCoinParticles(
        this.getLanePosition(coin.lane),
        coin.y
      );

      this.showMessage(
        multiplier === 2 ? "DOUBLE COINS!" : "+1 COIN",
        0.45
      );

      this.vibrate(10);
    }
  }
}
