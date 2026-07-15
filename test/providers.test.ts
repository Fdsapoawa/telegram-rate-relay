import { afterEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/providers/cache";
import { CoinbaseProvider } from "../src/providers/coinbase";
import { CoinGeckoProvider } from "../src/providers/coingecko";
import { FrankfurterProvider } from "../src/providers/frankfurter";
import { KrakenProvider } from "../src/providers/kraken";
import { RateService } from "../src/providers/registry";

const at = new Date("2026-07-15T06:30:25Z");

function jsonFetcher(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("rate providers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the default runtime fetch with the Worker global receiver", async () => {
    const runtime = globalThis;
    vi.stubGlobal(
      "fetch",
      vi.fn(function (this: unknown) {
        if (this !== runtime) throw new TypeError("Illegal invocation");
        return Promise.resolve(Response.json({ data: { rates: { CNY: "7.207" } } }));
      }),
    );
    const service = new RateService({ cacheTtlSeconds: 0 });

    await expect(
      service.getQuote({ amount: 5.2, from: "USDT", to: "CNY", source: "coinbase" }),
    ).resolves.toMatchObject({ rate: 7.207, source: "Coinbase" });
  });

  it("reads a Coinbase exchange rate", async () => {
    const fetcher = jsonFetcher({ data: { currency: "USDT", rates: { CNY: "7.207" } } });
    const provider = new CoinbaseProvider(fetcher, () => at);

    await expect(provider.getRate("USDT", "CNY")).resolves.toEqual({
      rate: 7.207,
      source: "Coinbase",
      asOf: at,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.coinbase.com/v2/exchange-rates?currency=USDT",
      expect.any(Object),
    );
  });

  it("reads a CoinGecko aggregate crypto-to-fiat rate", async () => {
    const fetcher = jsonFetcher({ tether: { cny: 7.21, last_updated_at: 1784097025 } });
    const provider = new CoinGeckoProvider(fetcher);

    const quote = await provider.getRate("USDT", "CNY");
    expect(quote.rate).toBe(7.21);
    expect(quote.source).toBe("CoinGecko");
    expect(quote.asOf.toISOString()).toBe("2026-07-15T06:30:25.000Z");
  });

  it("reads a Kraken spot close price", async () => {
    const fetcher = jsonFetcher({ error: [], result: { USDTZUSD: { c: ["1.0012", "1"] } } });
    const provider = new KrakenProvider(fetcher, () => at);

    await expect(provider.getRate("USDT", "USD")).resolves.toMatchObject({
      rate: 1.0012,
      source: "Kraken",
      asOf: at,
    });
  });

  it("reads a Frankfurter ECB fiat rate and date", async () => {
    const fetcher = jsonFetcher({ amount: 1, base: "EUR", date: "2026-07-14", rates: { CNY: 8.35 } });
    const provider = new FrankfurterProvider(fetcher);

    await expect(provider.getRate("EUR", "CNY")).resolves.toEqual({
      rate: 8.35,
      source: "Frankfurter",
      asOf: new Date("2026-07-14T00:00:00.000Z"),
    });
  });
});

describe("TtlCache", () => {
  it("reuses a value inside the configured TTL", async () => {
    let now = 1_000;
    const cache = new TtlCache<number>(30, () => now);
    const loader = vi.fn(async () => 7.2);

    await cache.get("USDT:CNY", loader);
    now += 29_000;
    await cache.get("USDT:CNY", loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("disables caching when TTL is zero", async () => {
    const cache = new TtlCache<number>(0);
    const loader = vi.fn(async () => 7.2);

    await cache.get("USDT:CNY", loader);
    await cache.get("USDT:CNY", loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
