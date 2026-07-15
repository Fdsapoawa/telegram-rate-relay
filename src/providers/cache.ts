interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlSeconds: number,
    private readonly now: () => number = Date.now,
  ) {}

  async get(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.ttlSeconds > 0) {
      const cached = this.entries.get(key);
      if (cached && cached.expiresAt > this.now()) return cached.value;
    }

    const value = await loader();
    if (this.ttlSeconds > 0) {
      this.entries.set(key, {
        expiresAt: this.now() + this.ttlSeconds * 1_000,
        value,
      });
    }
    return value;
  }
}
