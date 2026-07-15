import { handleUpdate, type BotDependencies, type TelegramUpdate } from "./app";
import { SOURCE_NAMES, type SourceKey } from "./parser";
import { RateService, parseCacheTtl } from "./providers/registry";
import { TelegramClient } from "./telegram";
import { createUserSettingsStore } from "./settings";

export { UserSettingsObject } from "./settings";

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  DEFAULT_SOURCE?: string;
  CACHE_TTL_SECONDS?: string;
  COINGECKO_API_KEY?: string;
  USER_SETTINGS?: DurableObjectNamespace;
}

let service: RateService | undefined;
let serviceSignature = "";

function defaultSource(value: string | undefined): SourceKey {
  const normalized = value?.toLowerCase() ?? "coinbase";
  return Object.hasOwn(SOURCE_NAMES, normalized) ? (normalized as SourceKey) : "coinbase";
}

function dependencies(env: Env): BotDependencies {
  const ttl = parseCacheTtl(env.CACHE_TTL_SECONDS);
  const signature = `${ttl}:${env.COINGECKO_API_KEY ?? ""}`;
  if (!service || serviceSignature !== signature) {
    service = new RateService({ cacheTtlSeconds: ttl, coinGeckoApiKey: env.COINGECKO_API_KEY });
    serviceSignature = signature;
  }
  return {
    defaultSource: defaultSource(env.DEFAULT_SOURCE),
    telegram: new TelegramClient(env.TELEGRAM_BOT_TOKEN),
    getQuote: (request) => service!.getQuote(request),
    settings: createUserSettingsStore(env.USER_SETTINGS),
  };
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, name: "RateRelay" });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not Found", { status: 404 });
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update: TelegramUpdate;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    await handleUpdate(update, dependencies(env));
    return new Response("OK");
  },
};
