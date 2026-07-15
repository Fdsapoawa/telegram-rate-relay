import { TimeZoneError, normalizeTimeZone } from "./timezone";

export const SOURCE_NAMES = {
  coinbase: "Coinbase",
  coingecko: "CoinGecko",
  kraken: "Kraken",
  frankfurter: "Frankfurter",
} as const;

export type SourceKey = keyof typeof SOURCE_NAMES;

export interface ConversionRequest {
  amount: number;
  from: string;
  to: string;
  source: SourceKey;
  timeZone?: string;
  usesDefaultSource?: true;
}

const CURRENCY_ALIASES: Record<string, string> = {
  美元: "USD",
  人民币: "CNY",
  人民币元: "CNY",
  欧元: "EUR",
  英镑: "GBP",
  日元: "JPY",
  港币: "HKD",
  台币: "TWD",
  韩元: "KRW",
  比特币: "BTC",
  以太坊: "ETH",
  泰达币: "USDT",
  美元币: "USDC",
};

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

function normalizeCurrency(value: string): string {
  const alias = CURRENCY_ALIASES[value];
  if (alias) return alias;

  const normalized = value.toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(normalized)) {
    throw new ParseError(`无效币种：${value}`);
  }
  return normalized;
}

export function parseSource(value: string): SourceKey {
  const normalized = value.toLowerCase();
  if (Object.hasOwn(SOURCE_NAMES, normalized)) return normalized as SourceKey;
  throw new ParseError(`未知汇率源：${value}。发送 /source 查看可用源`);
}

function normalizeSource(value: string | undefined, defaultSource: SourceKey): SourceKey {
  return value ? parseSource(value) : defaultSource;
}

export function parseConversion(input: string, defaultSource: SourceKey = "coinbase"): ConversionRequest {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 3 || parts.length > 5) {
    throw new ParseError("格式：金额 源币 目标币 [汇率源|none] [时区]");
  }

  const amount = Number(parts[0].replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ParseError("金额必须大于 0");
  }

  const sourceToken = parts[3];
  const usesDefaultPlaceholder = sourceToken?.toLowerCase() === "none";
  const usesDefaultSource = !sourceToken || usesDefaultPlaceholder;
  if (usesDefaultPlaceholder && !parts[4]) {
    throw new ParseError("none 后必须指定时区。发送 /time 查看用法");
  }
  const source = usesDefaultPlaceholder
    ? defaultSource
    : normalizeSource(sourceToken, defaultSource);

  let timeZone: string | undefined;
  if (parts[4]) {
    try {
      timeZone = normalizeTimeZone(parts[4]);
    } catch (error) {
      if (error instanceof TimeZoneError) throw new ParseError(error.message);
      throw error;
    }
  }

  return {
    amount,
    from: normalizeCurrency(parts[1]),
    to: normalizeCurrency(parts[2]),
    source,
    ...(timeZone ? { timeZone } : {}),
    ...(usesDefaultSource ? { usesDefaultSource: true as const } : {}),
  };
}
