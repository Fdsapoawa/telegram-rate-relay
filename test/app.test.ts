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
      timeKind: "retrieved" as const,
    })),
    settings: {
      get: vi.fn(async () => ({})),
      setTimeZone: vi.fn(async () => undefined),
      deleteTimeZone: vi.fn(async () => undefined),
      setSource: vi.fn(async () => undefined),
      deleteSource: vi.fn(async () => undefined),
    },
  };
}

describe("Telegram updates", () => {
  it("lists canonical source names and marks Coinbase as default", async () => {
    const deps = dependencies();
    await handleUpdate({ message: { chat: { id: 42 }, text: "/source" } }, deps);

    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(42, sourceHelp("coinbase"));
    expect(sourceHelp("coinbase")).toContain("⭐ Coinbase");
    expect(sourceHelp("coinbase")).not.toContain("CoinGecko");
    expect(sourceHelp("coinbase")).toContain("Binance");
    expect(sourceHelp("coinbase")).toContain("Frankfurter");
  });

  it("converts a direct message with a mixed-case source", async () => {
    const deps = dependencies();
    await handleUpdate({ message: { chat: { id: 42 }, text: "5.2 USDT CNY cOiNbAsE" } }, deps);

    expect(deps.getQuote).toHaveBeenCalledWith(expect.objectContaining({ source: "coinbase" }));
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      "💰 5.2 USDT ≈ 37.4764 CNY\n📡 Coinbase · 获取 14:30:25 · Asia/Shanghai (UTC+8)",
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
            message_text:
              "💰 5.2 USDT ≈ 37.4764 CNY\n📡 Coinbase · 获取 14:30:25 · Asia/Shanghai (UTC+8)",
          },
        }),
      ]),
    );
  });

  it("shows /time help with the current zone, inline example, and none explanation", async () => {
    const deps = dependencies();
    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/time" } },
      deps,
    );

    const reply = vi.mocked(deps.telegram.sendMessage).mock.calls[0]?.[1] ?? "";
    expect(reply).toContain("当前时区：Asia/Shanghai (UTC+8)");
    expect(reply).toContain("@机器人 5.2 USDT CNY none Shanghai");
    expect(reply).toContain("none 表示使用个人默认汇率源");
  });

  it("saves a canonical personal time zone", async () => {
    const deps = dependencies();
    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/time UTC" } },
      deps,
    );

    expect(deps.settings.setTimeZone).toHaveBeenCalledWith(7, "UTC");
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("时区已设置：UTC (UTC+0)"),
    );
  });

  it("resets a personal time zone to Beijing time", async () => {
    const deps = dependencies();
    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/time reset" } },
      deps,
    );

    expect(deps.settings.deleteTimeZone).toHaveBeenCalledWith(7);
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("已恢复默认时区：Asia/Shanghai (UTC+8)"),
    );
  });

  it("formats direct messages in the saved personal time zone", async () => {
    const deps = dependencies();
    vi.mocked(deps.settings.get).mockResolvedValue({ timeZone: "UTC" });

    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "5.2 USDT CNY" } },
      deps,
    );

    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      "💰 5.2 USDT ≈ 37.4764 CNY\n📡 Coinbase · 获取 06:30:25 · UTC (UTC+0)",
    );
  });

  it("uses an inline time-zone override with the saved personal source", async () => {
    const deps = dependencies();
    vi.mocked(deps.settings.get).mockResolvedValue({ source: "kraken" });
    await handleUpdate(
      {
        inline_query: {
          id: "inline-zone",
          from: { id: 7 },
          query: "5.2 USDT CNY none UTC",
        },
      },
      deps,
    );

    expect(deps.settings.get).toHaveBeenCalledWith(7);
    expect(deps.settings.setTimeZone).not.toHaveBeenCalled();
    expect(deps.settings.setSource).not.toHaveBeenCalled();
    expect(deps.getQuote).toHaveBeenCalledWith(expect.objectContaining({ source: "kraken" }));
    expect(deps.telegram.answerInlineQuery).toHaveBeenCalledWith(
      "inline-zone",
      expect.arrayContaining([
        expect.objectContaining({
          input_message_content: {
            message_text:
              "💰 5.2 USDT ≈ 37.4764 CNY\n📡 Coinbase · 获取 06:30:25 · UTC (UTC+0)",
          },
        }),
      ]),
    );
  });

  it("shows /source help with the personal source and none explanation", async () => {
    const deps = dependencies();
    vi.mocked(deps.settings.get).mockResolvedValue({ source: "kraken" });

    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/source" } },
      deps,
    );

    const reply = vi.mocked(deps.telegram.sendMessage).mock.calls[0]?.[1] ?? "";
    expect(reply).toContain("⭐ Kraken");
    expect(reply).toContain("设置：/source Coinbase");
    expect(reply).toContain("none 表示使用个人默认汇率源");
  });

  it("saves a case-insensitive exact personal source", async () => {
    const deps = dependencies();
    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/source bInAnCe" } },
      deps,
    );

    expect(deps.settings.setSource).toHaveBeenCalledWith(7, "binance");
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("默认汇率源已设置：Binance"),
    );
  });

  it("rejects CoinGecko after the source is removed", async () => {
    const deps = dependencies();

    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/source CoinGecko" } },
      deps,
    );

    expect(deps.settings.setSource).not.toHaveBeenCalled();
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("CoinGecko"),
    );
  });

  it("rejects an inexact source in /source", async () => {
    const deps = dependencies();
    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/source Coinbasew" } },
      deps,
    );

    expect(deps.settings.setSource).not.toHaveBeenCalled();
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      "未知汇率源：Coinbasew。发送 /source 查看可用源",
    );
  });

  it("resets a personal source", async () => {
    const deps = dependencies();
    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "/source reset" } },
      deps,
    );

    expect(deps.settings.deleteSource).toHaveBeenCalledWith(7);
    expect(deps.telegram.sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("已恢复默认汇率源：Coinbase"),
    );
  });

  it("uses a personal source only when the message does not specify one", async () => {
    const deps = dependencies();
    vi.mocked(deps.settings.get).mockResolvedValue({ source: "kraken" });

    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "5.2 USDT CNY" } },
      deps,
    );
    expect(deps.getQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: "kraken" }),
    );

    await handleUpdate(
      {
        message: {
          chat: { id: 42 },
          from: { id: 7 },
          text: "5.2 USDT CNY Coinbase",
        },
      },
      deps,
    );
    expect(deps.getQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: "coinbase" }),
    );
  });

  it("falls back when a removed source remains in personal settings", async () => {
    const deps = dependencies();
    vi.mocked(deps.settings.get).mockResolvedValue({ source: "coingecko" as never });

    await handleUpdate(
      { message: { chat: { id: 42 }, from: { id: 7 }, text: "5.2 USDT CNY" } },
      deps,
    );

    expect(deps.getQuote).toHaveBeenCalledWith(
      expect.objectContaining({ source: "coinbase" }),
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
