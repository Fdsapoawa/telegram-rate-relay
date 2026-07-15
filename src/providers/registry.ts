import type { RateQuote } from "../format";
import type { ConversionRequest, SourceKey } from "../parser";
import { TtlCache } from "./cache";
import { CoinbaseProvider } from "./coinbase";
import { CoinGeckoProvider } from "./coingecko";
import { FrankfurterProvider } from "./frankfurter";
import { KrakenProvider } from "./kraken";
import { ProviderError, type Fetcher, type RateProvider } from "./types";

export interface ProviderOptions {
  cacheTtlSeconds: number;
  coinGeckoApiKey?: string;
  fetcher?: Fetcher;
}

export class RateService {
  private readonly providers: Map<SourceKey, RateProvider>;
  private readonly cache: TtlCache<RateQuote>;

  constructor(options: ProviderOptions) {
    const fetcher = options.fetcher ?? fetch;
    const providers: Array<[SourceKey, RateProvider]> = [
      ["coinbase", new CoinbaseProvider(fetcher)],
      ["coingecko", new CoinGeckoProvider(fetcher, options.coinGeckoApiKey)],
      ["kraken", new KrakenProvider(fetcher)],
      ["frankfurter", new FrankfurterProvider(fetcher)],
    ];
    this.providers = new Map(providers);
    this.cache = new TtlCache(options.cacheTtlSeconds);
  }

  getQuote(request: ConversionRequest): Promise<RateQuote> {
    const provider = this.providers.get(request.source);
    if (!provider) throw new ProviderError(`未知汇率源：${request.source}`);
    const key = `${request.source}:${request.from}:${request.to}`;
    return this.cache.get(key, () => provider.getRate(request.from, request.to));
  }
}

export function parseCacheTtl(value: string | undefined): number {
  if (value === undefined || value === "") return 30;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3600) return 30;
  return parsed;
}
