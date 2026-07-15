import { expect, it } from "vitest";
import { formatResult } from "../src/format";

it("formats a compact two-line result with canonical source spelling", () => {
  const text = formatResult(
    { amount: 5.2, from: "USDT", to: "CNY", source: "coinbase" },
    { rate: 7.207, source: "Coinbase", asOf: new Date("2026-07-15T06:30:25Z") },
  );

  expect(text).toBe("💰 5.2 USDT = 37.4764 CNY\n📡 Coinbase · 14:30:25");
});
