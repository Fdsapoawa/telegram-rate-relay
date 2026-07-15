import type { RateQuote } from "../format";
import { ProviderError, fetchJson, requirePositiveRate, runtimeFetch, type Fetcher, type RateProvider } from "./types";

interface KrakenResponse {
  error?: string[];
  result?: Record<string, { c?: [string, string] }>;
}

const KRAKEN_CODE: Record<string, string> = { BTC: "XBT", DOGE: "XDG" };

export class KrakenProvider implements RateProvider {
  readonly key = "kraken";
  readonly name = "Kraken";

  constructor(
    private readonly fetcher: Fetcher = runtimeFetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getRate(from: string, to: string): Promise<RateQuote> {
    if (from === to) return { rate: 1, source: this.name, asOf: this.now() };
    const pair = `${KRAKEN_CODE[from] ?? from}${KRAKEN_CODE[to] ?? to}`;
    const data = await fetchJson<KrakenResponse>(
      this.fetcher,
      `https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`,
    );
    if (data.error?.length || !data.result) {
      throw new ProviderError(`Kraken 不支持 ${from}/${to}`);
    }
    const ticker = Object.values(data.result)[0];
    return {
      rate: requirePositiveRate(ticker?.c?.[0], from, to),
      source: this.name,
      asOf: this.now(),
    };
  }
}
