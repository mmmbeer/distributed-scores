export class GamePoller {
  constructor({ load, apply, status, canApply }) {
    this.load = load;
    this.apply = apply;
    this.status = status;
    this.canApply = canApply || (() => true);
    this.stopped = false;
    this.version = 0;
  }

  start(version = 0) {
    this.version = version;
    this.stopped = false;
    this.poll();
  }

  stop() {
    this.stopped = true;
  }

  async poll() {
    if (this.stopped) return;
    try {
      const game = await this.load(this.version, document.hidden ? 5 : 25);
      if (this.canApply() && game.version !== this.version) {
        this.version = game.version;
        this.apply(game);
      }
      this.status("Live sync");
    } catch {
      this.status("Reconnecting...");
      await new Promise(resolve => setTimeout(resolve, 1200));
    } finally {
      this.poll();
    }
  }
}
