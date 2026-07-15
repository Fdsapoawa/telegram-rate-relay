import type { RateQuote } from "../format";
import { fetchJson, requirePositiveRate, runtimeFetch, type Fetcher, type RateProvider } from "./types";

interface FrankfurterResponse {
  date?: string;
  rates?: Record<string, number>;
}

export class FrankfurterProvider implements RateProvider {
  readonly key = "frankfurter";
  readonly name = "Frankfurter";

  constructor(
    private readonly fetcher: Fetcher = runtimeFetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getRate(from: string, to: string): Promise<RateQuote> {
    if (from === to) return { rate: 1, source: this.name, asOf: this.now() };
    const data = await fetchJson<FrankfurterResponse>(
      this.fetcher,
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`,
    );
    return {
      rate: requirePositiveRate(data.rates?.[to], from, to),
      source: this.name,
      asOf: data.date ? new Date(`${data.date}T00:00:00.000Z`) : this.now(),
    };
  }
}
