export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

const TIME_ZONE_ALIASES: Record<string, string> = {
  shanghai: DEFAULT_TIME_ZONE,
  beijing: DEFAULT_TIME_ZONE,
  china: DEFAULT_TIME_ZONE,
  "上海": DEFAULT_TIME_ZONE,
  "北京": DEFAULT_TIME_ZONE,
  utc8: DEFAULT_TIME_ZONE,
  "utc+8": DEFAULT_TIME_ZONE,
  "gmt+8": DEFAULT_TIME_ZONE,
  "+8": DEFAULT_TIME_ZONE,
  utc: "UTC",
  utc0: "UTC",
  gmt: "UTC",
  tokyo: "Asia/Tokyo",
  london: "Europe/London",
  paris: "Europe/Paris",
  newyork: "America/New_York",
  losangeles: "America/Los_Angeles",
  singapore: "Asia/Singapore",
  hongkong: "Asia/Hong_Kong",
};

export class TimeZoneError extends Error {
  constructor(value: string) {
    super(`未知时区：${value}。发送 /time 查看用法`);
    this.name = "TimeZoneError";
  }
}

export function normalizeTimeZone(value: string): string {
  const input = value.trim();
  const alias = TIME_ZONE_ALIASES[input.toLowerCase()];
  if (alias) return alias;

  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: input }).resolvedOptions().timeZone;
  } catch {
    throw new TimeZoneError(value);
  }
}

function utcOffset(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find(({ type }) => type === "timeZoneName")?.value;
  if (!part || part === "GMT") return "UTC+0";

  const match = part.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) return part.replace("GMT", "UTC");
  const minutes = Number(match[3]);
  return `UTC${match[1]}${Number(match[2])}${minutes ? `:${match[3]}` : ""}`;
}

export function timeZoneLabel(timeZone: string, date: Date): string {
  return `${timeZone} (${utcOffset(date, timeZone)})`;
}
