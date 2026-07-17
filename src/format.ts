import type { ConversionRequest } from "./parser";
import { DEFAULT_TIME_ZONE, timeZoneLabel } from "./timezone";

export type RateTimeKind = "market" | "retrieved" | "reference";

export interface RateQuote {
  rate: number;
  source: string;
  asOf: Date;
  timeKind?: RateTimeKind;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  maximumFractionDigits: 12,
});

const TIME_KIND_LABELS: Record<RateTimeKind, string> = {
  market: "行情",
  retrieved: "",
  reference: "参考",
};

export function formatResult(
  request: ConversionRequest,
  quote: RateQuote,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const converted = request.amount * quote.rate;
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(quote.asOf);
  const timeKind = quote.timeKind ?? "retrieved";
  const displayedTime = timeKind === "reference"
    ? quote.asOf.toISOString().slice(0, 10)
    : time;
  const timeLabel = TIME_KIND_LABELS[timeKind];
  const timeText = timeLabel ? `${timeLabel} ${displayedTime}` : displayedTime;
  return [
    `💰 ${numberFormatter.format(request.amount)} ${request.from} ≈ ${numberFormatter.format(converted)} ${request.to}`,
    `📡 ${quote.source}`,
    `🕒 ${timeText} · ${timeZoneLabel(timeZone, quote.asOf)}`,
  ].join("\n");
}
