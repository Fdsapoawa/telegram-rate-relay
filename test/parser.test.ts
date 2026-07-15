import { describe, expect, it } from "vitest";
import { ParseError, parseConversion } from "../src/parser";

describe("parseConversion", () => {
  it("uses Coinbase when source is omitted", () => {
    expect(parseConversion("5.2 USDT CNY")).toEqual({
      amount: 5.2,
      from: "USDT",
      to: "CNY",
      source: "coinbase",
      usesDefaultSource: true,
    });
  });

  it.each(["Coinbase", "cOINBASE", "cOiNbAsE"])(
    "matches source case-insensitively: %s",
    (source) => {
      expect(parseConversion(`5.2 usdt cny ${source}`).source).toBe("coinbase");
    },
  );

  it("matches Binance case-insensitively", () => {
    expect(parseConversion("1 BTC USDT bInAnCe").source).toBe("binance");
  });

  it("requires an exact source name", () => {
    expect(() => parseConversion("5.2 USDT CNY Coinbasew")).toThrowError(
      new ParseError("未知汇率源：Coinbasew。发送 /source 查看可用源"),
    );
  });

  it("uses none as an exact default-source placeholder before a time zone", () => {
    expect(parseConversion("5.2 USDT CNY NoNe Shanghai")).toEqual({
      amount: 5.2,
      from: "USDT",
      to: "CNY",
      source: "coinbase",
      usesDefaultSource: true,
      timeZone: "Asia/Shanghai",
    });
  });

  it("accepts a source followed by a time-zone alias", () => {
    expect(parseConversion("5.2 USDT CNY Coinbase UTC8")).toMatchObject({
      source: "coinbase",
      timeZone: "Asia/Shanghai",
    });
  });

  it("requires an exact none placeholder", () => {
    expect(() => parseConversion("5.2 USDT CNY nonew Asia/Shanghai")).toThrowError(
      new ParseError("未知汇率源：nonew。发送 /source 查看可用源"),
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

  it("rejects an invalid time zone", () => {
    expect(() => parseConversion("5.2 USDT CNY none Moon/Base")).toThrowError(
      "未知时区：Moon/Base。发送 /time 查看用法",
    );
  });
});
