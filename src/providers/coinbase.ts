import type { RateQuote } from "../format";
import { fetchJson, requirePositiveRate, type Fetcher, type RateProvider } from "./types";

interface CoinbaseResponse {
  data?: {
    rates?: Record<string, string>;
  };
}

export class CoinbaseProvider implements RateProvider {
  readonly key = "coinbase";
  readonly name = "Coinbase";

  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getRate(from: string, to: string): Promise<RateQuote> {
    if (from === to) return { rate: 1, source: this.name, asOf: this.now() };
    const data = await fetchJson<CoinbaseResponse>(
      this.fetcher,
      `https://api.coinbase.com/v2/exchange-rates?currency=${encodeURIComponent(from)}`,
      { "User-Agent": "RateRelay/1.0" },
    );
    return {
      rate: requirePositiveRate(data.data?.rates?.[to], from, to),
      source: this.name,
      asOf: this.now(),
    };
  }
}
