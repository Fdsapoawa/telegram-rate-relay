import type { RateQuote } from "../format";
import {
  ProviderError,
  requirePositiveRate,
  runtimeFetch,
  type Fetcher,
  type RateProvider,
} from "./types";

interface BinanceTickerResponse {
  price?: string;
  code?: number;
}

export class BinanceProvider implements RateProvider {
  readonly key = "binance";
  readonly name = "Binance";

  constructor(
    private readonly fetcher: Fetcher = runtimeFetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getRate(from: string, to: string): Promise<RateQuote> {
    if (from === to) {
      return { rate: 1, source: this.name, asOf: this.now(), timeKind: "retrieved" };
    }

    const direct = await this.ticker(from, to);
    if (direct) return this.quote(direct);

    const reverse = await this.ticker(to, from);
    if (reverse) return this.quote(1 / reverse);

    const fromUsdt = await this.usdtRate(from);
    const toUsdt = await this.usdtRate(to);
    if (!fromUsdt || !toUsdt) {
      throw new ProviderError(`Binance 不支持 ${from}/${to}`);
    }
    return this.quote(fromUsdt / toUsdt);
  }

  private quote(rate: number): RateQuote {
    return { rate, source: this.name, asOf: this.now(), timeKind: "retrieved" };
  }

  private async usdtRate(asset: string): Promise<number | undefined> {
    if (asset === "USDT") return 1;
    const direct = await this.ticker(asset, "USDT");
    if (direct) return direct;
    const reverse = await this.ticker("USDT", asset);
    return reverse ? 1 / reverse : undefined;
  }

  private async ticker(base: string, quote: string): Promise<number | undefined> {
    const symbol = `${base}${quote}`;
    let response: Response;
    try {
      response = await this.fetcher(
        `https://api-gcp.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "RateRelay/1.0",
          },
        },
      );
    } catch {
      throw new ProviderError("汇率源暂时无法连接");
    }

    let data: BinanceTickerResponse;
    try {
      data = (await response.json()) as BinanceTickerResponse;
    } catch {
      throw new ProviderError("汇率源返回了无效数据");
    }
    if (response.status === 400 && data.code === -1121) return undefined;
    if (!response.ok) throw new ProviderError(`汇率源请求失败 (${response.status})`);
    return requirePositiveRate(data.price, base, quote);
  }
}
