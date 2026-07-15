import { describe, expect, it } from "vitest";
import { ParseError, parseConversion } from "../src/parser";

describe("parseConversion", () => {
  it("uses Coinbase when source is omitted", () => {
    expect(parseConversion("5.2 USDT CNY")).toEqual({
      amount: 5.2,
      from: "USDT",
      to: "CNY",
      source: "coinbase",
    });
  });

  it.each(["Coinbase", "cOINBASE", "cOiNbAsE"])(
    "matches source case-insensitively: %s",
    (source) => {
      expect(parseConversion(`5.2 usdt cny ${source}`).source).toBe("coinbase");
    },
  );

  it("requires an exact source name", () => {
    expect(() => parseConversion("5.2 USDT CNY Coinbasew")).toThrowError(
      new ParseError("未知汇率源：Coinbasew。发送 /source 查看可用源"),
    );
  });

  it("normalizes common Chinese aliases", () => {
    expect(parseConversion("100 美元 人民币")).toMatchObject({
      amount: 100,
      from: "USD",
      to: "CNY",
    });
  });

  it("rejects non-positive amounts", () => {
    expect(() => parseConversion("0 USD CNY")).toThrow(ParseError);
  });
});
