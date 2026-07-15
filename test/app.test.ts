import { describe, expect, it, vi } from "vitest";
import { handleUpdate, sourceHelp, type BotDependencies } from "../src/app";
import worker from "../src/index";

function dependencies(): BotDependencies {
  return {
    defaultSource: "coinbase",
    telegram: {
      sendMessage: vi.fn(async () => undefined),
      answerInlineQuery: vi.fn(async () => undefined),
    },
    getQuote: vi.fn(async () => ({
      rate: 7.207,
      source: "Coinbase",
      asOf: new Date("2026-07-15T06:30:25Z"),
    })),
  };
}

describe("Telegram updates", () => {
  it("lists canonical source names and marks Coinbase as default", async () => {
    const deps = dependencies();
    await handleUpdate({ message: { chat: { id: 42 }, text: "/source" } }, deps);

    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(42, sourceHelp("coinbase"));
    expect(sourceHelp("coinbase")).toContain("⭐ Coinbase");
    expect(sourceHelp("coinbase")).toContain("CoinGecko");
    expect(sourceHelp("coinbase")).toContain("Frankfurter");
  });

  it("converts a direct message with a mixed-case source", async () => {
    const deps = dependencies();
    await handleUpdate({ message: { chat: { id: 42 }, text: "5.2 USDT CNY cOiNbAsE" } }, deps);

    expect(deps.getQuote).toHaveBeenCalledWith(expect.objectContaining({ source: "coinbase" }));
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      "💰 5.2 USDT = 37.4764 CNY\n📡 Coinbase · 14:30:25",
    );
  });

  it("rejects a source with an extra character", async () => {
    const deps = dependencies();
    await handleUpdate({ message: { chat: { id: 42 }, text: "5.2 USDT CNY Coinbasew" } }, deps);

    expect(deps.getQuote).not.toHaveBeenCalled();
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      "未知汇率源：Coinbasew。发送 /source 查看可用源",
    );
  });

  it("returns an insertable inline conversion result", async () => {
    const deps = dependencies();
    await handleUpdate({ inline_query: { id: "inline-1", query: "5.2 USDT CNY Coinbase" } }, deps);

    expect(deps.telegram.answerInlineQuery).toHaveBeenCalledWith(
      "inline-1",
      expect.arrayContaining([
        expect.objectContaining({
          type: "article",
          input_message_content: {
            message_text: "💰 5.2 USDT = 37.4764 CNY\n📡 Coinbase · 14:30:25",
          },
        }),
      ]),
    );
  });
});

it("rejects webhook requests with the wrong Telegram secret", async () => {
  const request = new Request("https://worker.example/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong" },
    body: "{}",
  });
  const response = await worker.fetch(
    request,
    {
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_WEBHOOK_SECRET: "right",
      DEFAULT_SOURCE: "coinbase",
      CACHE_TTL_SECONDS: "30",
    },
    {} as ExecutionContext,
  );

  expect(response.status).toBe(401);
});
