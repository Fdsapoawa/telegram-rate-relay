import type { ConversionRequest } from "./parser";

export interface RateQuote {
  rate: number;
  source: string;
  asOf: Date;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  maximumFractionDigits: 12,
});

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatResult(request: ConversionRequest, quote: RateQuote): string {
  const converted = request.amount * quote.rate;
  return [
    `💰 ${numberFormatter.format(request.amount)} ${request.from} = ${numberFormatter.format(converted)} ${request.to}`,
    `📡 ${quote.source} · ${timeFormatter.format(quote.asOf)}`,
  ].join("\n");
}
