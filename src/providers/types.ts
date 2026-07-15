import type { RateQuote } from "../format";

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface RateProvider {
  readonly key: string;
  readonly name: string;
  getRate(from: string, to: string): Promise<RateQuote>;
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export async function fetchJson<T>(
  fetcher: Fetcher,
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, { headers: { Accept: "application/json", ...headers } });
  } catch {
    throw new ProviderError("汇率源暂时无法连接");
  }

  if (!response.ok) throw new ProviderError(`汇率源请求失败 (${response.status})`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ProviderError("汇率源返回了无效数据");
  }
}

export function requirePositiveRate(value: unknown, from: string, to: string): number {
  const rate = typeof value === "string" ? Number(value) : value;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new ProviderError(`该汇率源不支持 ${from}/${to}`);
  }
  return rate;
}
