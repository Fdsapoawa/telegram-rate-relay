import { expect, it, vi } from "vitest";
import { CoinGeckoProvider } from "../src/providers/coingecko";

it("sends the descriptive User-Agent required by CoinGecko", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ tether: { cny: 6.76, last_updated_at: 1784092939 } }),
  );
  const provider = new CoinGeckoProvider(fetcher);

  await provider.getRate("USDT", "CNY");

  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining("api.coingecko.com/api/v3/simple/price"),
    expect.objectContaining({
      headers: expect.objectContaining({ "User-Agent": "RateRelay/1.0" }),
    }),
  );
});
