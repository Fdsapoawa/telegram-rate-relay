import { expect, it } from "vitest";
import { formatResult } from "../src/format";

it("formats source and retrieved time on separate lines", () => {
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
    "💰 5.2 USDT ≈ 37.4764 CNY\n📡 Coinbase\n🕒 14:30:25 · Asia/Shanghai (UTC+8)",
  );
});

it("labels a source-provided market timestamp in the selected time zone", () => {
  const text = formatResult(
    { amount: 1, from: "BTC", to: "USD", source: "binance", timeZone: undefined },
    {
      rate: 64684.06,
      source: "Binance",
      asOf: new Date("2026-07-15T06:30:25Z"),
      timeKind: "market",
    },
    "UTC",
  );

  expect(text).toContain("📡 Binance\n🕒 行情 06:30:25 · UTC (UTC+0)");
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

  expect(text).toContain("📡 Frankfurter\n🕒 参考 2026-07-14 · Asia/Shanghai (UTC+8)");
});

it("formats a result in a fixed UTC offset", () => {
  const text = formatResult(
    { amount: 1, from: "USD", to: "SOL", source: "binance" },
    {
      rate: 0.01,
      source: "Binance",
      asOf: new Date("2026-07-15T06:30:25Z"),
      timeKind: "retrieved",
    },
    "Etc/GMT-9",
  );

  expect(text).toContain("📡 Binance\n🕒 15:30:25 · UTC+9");
});
