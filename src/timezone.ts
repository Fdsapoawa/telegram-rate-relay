export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

const TIME_ZONE_ALIASES: Record<string, string> = {
  shanghai: DEFAULT_TIME_ZONE,
  beijing: DEFAULT_TIME_ZONE,
  "上海": DEFAULT_TIME_ZONE,
  "北京": DEFAULT_TIME_ZONE,
  taipei: "Asia/Taipei",
  "台北": "Asia/Taipei",
  "臺北": "Asia/Taipei",
  tokyo: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
  "东京": "Asia/Tokyo",
  "東京": "Asia/Tokyo",
  "大阪": "Asia/Tokyo",
  losangeles: "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  "洛杉矶": "America/Los_Angeles",
  "洛杉磯": "America/Los_Angeles",
  newyork: "America/New_York",
  "new york": "America/New_York",
  "纽约": "America/New_York",
  "紐約": "America/New_York",
  london: "Europe/London",
  "伦敦": "Europe/London",
  paris: "Europe/Paris",
  "巴黎": "Europe/Paris",
  singapore: "Asia/Singapore",
  "新加坡": "Asia/Singapore",
  hongkong: "Asia/Hong_Kong",
  "hong kong": "Asia/Hong_Kong",
  "香港": "Asia/Hong_Kong",
  utc8: DEFAULT_TIME_ZONE,
  "utc+8": DEFAULT_TIME_ZONE,
  "utc+08": DEFAULT_TIME_ZONE,
  "utc+08:00": DEFAULT_TIME_ZONE,
  "gmt+8": DEFAULT_TIME_ZONE,
  "gmt+08": DEFAULT_TIME_ZONE,
  "+8": DEFAULT_TIME_ZONE,
  "+08": DEFAULT_TIME_ZONE,
  "+08:00": DEFAULT_TIME_ZONE,
  utc: "UTC",
  utc0: "UTC",
  "utc+0": "UTC",
  gmt: "UTC",
};

export class TimeZoneError extends Error {
  constructor(value: string) {
    super(`未知时区：${value}。发送 /time 查看用法`);
    this.name = "TimeZoneError";
  }
}

function normalizeUtcOffset(input: string): string | undefined {
  const match = input.match(/^utc([+-]?)(\d{1,2})$/i);
  if (!match) return undefined;

  const hours = Number(match[2]) * (match[1] === "-" ? -1 : 1);
  if (hours < -12 || hours > 14) throw new TimeZoneError(input);
  if (hours === 0) return "UTC";

  const etcSign = hours > 0 ? "-" : "+";
  return `Etc/GMT${etcSign}${Math.abs(hours)}`;
}

export function normalizeTimeZone(value: string): string {
  const input = value.trim();
  const alias = TIME_ZONE_ALIASES[input.toLowerCase()];
  if (alias) return alias;

  const utcOffset = normalizeUtcOffset(input);
  if (utcOffset) return utcOffset;

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
  const fixedOffset = timeZone.match(/^Etc\/GMT([+-])(\d{1,2})$/);
  if (fixedOffset) {
    const sign = fixedOffset[1] === "-" ? "+" : "-";
    return `UTC${sign}${Number(fixedOffset[2])}`;
  }
  return `${timeZone} (${utcOffset(date, timeZone)})`;
}
