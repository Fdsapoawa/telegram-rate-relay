import { expect, it } from "vitest";
import { formatResult } from "../src/format";

it("formats a compact two-line result with canonical source spelling", () => {
  const text = formatResult(
    { amount: 5.2, from: "USDT", to: "CNY", source: "coinbase", timeZone: undefined },
    {
      rate: 7.207,
      source: "Coinbase",
      asOf: new Date("2026-07-15T06:30:25Z"),
      timeKind: "retrieved",
    },
    "Asia/Shanghai",
  );

  expect(text).toBe(
    "💰 5.2 USDT ≈ 37.4764 CNY\n📡 Coinbase · 获取 14:30:25 · Asia/Shanghai (UTC+8)",
  );
});

it("labels a source-provided market timestamp in the selected time zone", () => {
  const text = formatResult(
    { amount: 1, from: "BTC", to: "USD", source: "coingecko", timeZone: undefined },
    {
      rate: 64684.06,
      source: "CoinGecko",
      asOf: new Date("2026-07-15T06:30:25Z"),
      timeKind: "market",
    },
    "UTC",
  );

  expect(text).toContain("📡 CoinGecko · 行情 06:30:25 · UTC (UTC+0)");
});

it("formats a daily reference rate as a date instead of a fabricated time", () => {
  const text = formatResult(
    { amount: 100, from: "EUR", to: "CNY", source: "frankfurter" },
    {
      rate: 8.35,
      source: "Frankfurter",
      asOf: new Date("2026-07-14T00:00:00Z"),
      timeKind: "reference",
    },
    "Asia/Shanghai",
  );

  expect(text).toContain("📡 Frankfurter · 参考 2026-07-14 · Asia/Shanghai (UTC+8)");
});
