import type { RateQuote } from "../format";
import { ProviderError, fetchJson, requirePositiveRate, type Fetcher, type RateProvider } from "./types";

const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  TRX: "tron",
  TON: "the-open-network",
  DOT: "polkadot",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  SHIB: "shiba-inu",
  DAI: "dai",
};

interface PriceData {
  [id: string]: Record<string, number> & { last_updated_at?: number };
}

export class CoinGeckoProvider implements RateProvider {
  readonly key = "coingecko";
  readonly name = "CoinGecko";

  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly apiKey?: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getRate(from: string, to: string): Promise<RateQuote> {
    if (from === to) return { rate: 1, source: this.name, asOf: this.now() };
    const fromId = CRYPTO_IDS[from];
    const toId = CRYPTO_IDS[to];
    if (!fromId && !toId) throw new ProviderError("CoinGecko 仅支持包含加密货币的换算");

    const ids = fromId && toId ? `${fromId},${toId}` : (fromId ?? toId);
    const vs = fromId && toId ? "usd" : (fromId ? to : from).toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}&include_last_updated_at=true`;
    const headers = this.apiKey ? { "x-cg-demo-api-key": this.apiKey } : undefined;
    const data = await fetchJson<PriceData>(this.fetcher, url, headers);

    let rate: number;
    if (fromId && toId) {
      rate = requirePositiveRate(data[fromId]?.usd, from, "USD") /
        requirePositiveRate(data[toId]?.usd, to, "USD");
    } else if (fromId) {
      rate = requirePositiveRate(data[fromId]?.[vs], from, to);
    } else {
      rate = 1 / requirePositiveRate(data[toId]?.[vs], to, from);
    }

    const timestamp = data[fromId ?? toId]?.last_updated_at;
    return {
      rate,
      source: this.name,
      asOf: timestamp ? new Date(timestamp * 1_000) : this.now(),
    };
  }
}
