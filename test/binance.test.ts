import { describe, expect, it, vi } from "vitest";
import { BinanceProvider } from "../src/providers/binance";

const at = new Date("2026-07-15T06:30:25Z");

function binanceFetcher(prices: Record<string, string>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const symbol = new URL(String(input)).searchParams.get("symbol") ?? "";
    const price = prices[symbol];
    return price
      ? Response.json({ symbol, price })
      : Response.json({ code: -1121, msg: "Invalid symbol." }, { status: 400 });
  });
}

describe("BinanceProvider", () => {
  it("reads a direct public spot pair without an API key", async () => {
    const fetcher = binanceFetcher({ BTCUSDT: "64688.46" });
    const provider = new BinanceProvider(fetcher, () => at);

    await expect(provider.getRate("BTC", "USDT")).resolves.toEqual({
      rate: 64688.46,
      source: "Binance",
      asOf: at,
      timeKind: "retrieved",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": "RateRelay/1.0" }),
      }),
    );
  });

  it("inverts the reverse spot pair", async () => {
    const provider = new BinanceProvider(binanceFetcher({ BTCUSDT: "64688.46" }), () => at);

    const quote = await provider.getRate("USDT", "BTC");

    expect(quote.rate).toBeCloseTo(1 / 64688.46, 14);
  });

  it("bridges two assets through USDT", async () => {
    const provider = new BinanceProvider(
      binanceFetcher({ SOLUSDT: "150", ETHUSDT: "3000" }),
      () => at,
    );

    const quote = await provider.getRate("SOL", "ETH");

    expect(quote.rate).toBe(0.05);
  });

  it("rejects a pair absent from Binance instead of switching sources", async () => {
    const provider = new BinanceProvider(binanceFetcher({}), () => at);

    await expect(provider.getRate("USDT", "CNY")).rejects.toThrow(
      "Binance 不支持 USDT/CNY",
    );
  });
});
